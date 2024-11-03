import { NextResponse } from "next/server";
import OpenAI from 'openai';
import dotenv from "dotenv";

dotenv.config();

export interface AnalysisMetadata {
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface AnalysisResult {
  rawData: {
    ceis: any;
    cnep: any;
    cepim: any;
    acordos: any; // Adicionado campo para acordos de leniência
  };
  aiAnalysis: string;
  timestamp: string;
  requestId: string;
  metadata: AnalysisMetadata;
}

export function createAnalysis(
  ceisData: any,
  cnepData: any,
  cepimData: any,
  acordosData: any, // Novo parâmetro
  aiResponse: string, 
  completion: OpenAI.Chat.Completions.ChatCompletion
): AnalysisResult {
  return {
    rawData: {
      ceis: ceisData,
      cnep: cnepData,
      cepim: cepimData,
      acordos: acordosData // Incluído nos dados brutos
    },
    aiAnalysis: aiResponse,
    timestamp: new Date().toISOString(),
    requestId: crypto.randomUUID(),
    metadata: {
      model: completion.model,
      promptTokens: completion.usage?.prompt_tokens,
      completionTokens: completion.usage?.completion_tokens,
      totalTokens: completion.usage?.total_tokens
    }
  };
}

export async function POST(request: Request) {
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: "Chave da API OpenAI não configurada" },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    const { ceisData, cnepData, cepimData, acordosData } = await request.json();

    if ((!ceisData && !cnepData && !cepimData && !acordosData) || 
        (Array.isArray(ceisData) && Array.isArray(cnepData) && 
         Array.isArray(cepimData) && Array.isArray(acordosData) && 
         ceisData.length === 0 && cnepData.length === 0 && 
         cepimData.length === 0 && acordosData.length === 0)) {
      return NextResponse.json(
        { error: "Nenhum dado fornecido para análise" },
        { status: 400 }
      );
    }

    const systemPrompt = `
    Você é um assistente da Auditoria interna do Grupo Algar e tem a responsabilidade de realizar uma avaliação 
    due diligence para avaliar a possível contratação de fornecedores a partir dos retornos em json a partir de requisições feitas em API's do portal da transparência. 
    Você receberá dados das seguintes listas:
    
    1. CEIS (Cadastro de Empresas Inidôneas e Suspensas)
    2. CNEP (Cadastro Nacional de Empresas Punidas)
    3. CEPIM (Cadastro de Entidades Privadas Sem Fins Lucrativos Impedidas)
    4. Acordos de Leniência (Acordos firmados com empresas envolvidas em atos lesivos)

    Sua análise  Due Diligence deve:

    1. Avaliar a presença ou ausência da empresa em cada lista e suas implicações:
       - CEIS: Foco em sanções administrativas e impedimentos
       - CNEP: Foco em Lei Anticorrupção e acordos de leniência
       - CEPIM: Foco em impedimentos relacionados a transferências de recursos federais
       - Acordos de Leniência: Foco em acordos firmados, seus termos e status atual

    2. Para cada lista, considerar:
       - Natureza e gravidade das sanções/impedimentos
       - Período de vigência das restrições
       - Órgãos responsáveis pelas sanções
       - Motivações e fundamentos legais
       - No caso de acordos de leniência, avaliar:
         * Termos e condições do acordo
         * Status de cumprimento
         * Impacto nas operações atuais

    3. Fornecer uma análise consolidada que:
       - Avalie o risco global para a Algar
       - Considere o impacto combinado das restrições
       - Identifique padrões de não conformidade
       - Avalie a extensão temporal das sanções
       - Analise a efetividade de eventuais acordos de leniência

    4. Concluir com uma recomendação clara sobre:
       - Viabilidade de relações comerciais
       - Ressalvas ou condições específicas

    Forneça uma conclusão objetiva e bem fundamentada, considerando o impacto combinado de todas as 
    restrições encontradas nas listas e acordos de leniência.`;

    const userPrompt = `Por favor, analise os seguintes dados das listas CEIS, CNEP, CEPIM e Acordos de Leniência:

    Dados CEIS:
    ${JSON.stringify(ceisData, null, 2)}

    Dados CNEP:
    ${JSON.stringify(cnepData, null, 2)}

    Dados CEPIM:
    ${JSON.stringify(cepimData, null, 2)}

    Dados Acordos de Leniência:
    ${JSON.stringify(acordosData, null, 2)}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.5,
      max_tokens: 2000
    });

    const aiResponse = completion.choices[0]?.message?.content || "Não foi possível gerar uma análise.";
    
    const analysis = createAnalysis(ceisData, cnepData, cepimData, acordosData, aiResponse, completion);
    
    return NextResponse.json(analysis);

  } catch (error) {
    console.error("Erro ao processar análise:", error);
    return NextResponse.json(
      { 
        error: "Erro ao processar a análise", 
        details: error instanceof Error ? error.message : "Erro desconhecido"
      },
      { status: 500 }
    );
  }
}