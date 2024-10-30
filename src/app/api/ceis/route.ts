// app/api/search/route.ts
import { NextResponse } from "next/server";
import dotenv from "dotenv";

dotenv.config();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cnpj = searchParams.get("cnpj")?.replace(/[^\d]+/g, "");
    const cpf = searchParams.get("cpf")?.replace(/[^\d]+/g, "");

    console.log(cnpj);

    // Comentado mas mantido para referência
    // if (!cnpj) {
    //   return NextResponse.json({ error: "CNPJ não fornecido" }, { status: 400 });
    // }

    const apiKey = process.env.API_KEY;
    const url = `https://api.portaldatransparencia.gov.br/api-de-dados/ceis?codigoSancionado=${cnpj}&pagina=1`;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Chave da API não configurada." },
        { status: 500 }
      );
    }

    try {
      console.log(`CNPJ: ${cnpj}`);
      console.log(`URL da requisição: ${url}`);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "chave-api-dados": apiKey,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: "Erro ao buscar dados da API" },
          { status: response.status }
        );
      }

      const portalData = await response.json();

      // Fazer a chamada para o endpoint de análise
      const analysisResponse = await fetch(new URL('/api/analyze-compliance', request.url), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(portalData)
      });

      if (!analysisResponse.ok) {
        throw new Error('Falha ao analisar os dados');
      }

      const analysisResult = await analysisResponse.json();

      // Retornar tanto os dados brutos quanto a análise
      return NextResponse.json({
        portalData: portalData,        // Dados originais do Portal da Transparência
        analysis: analysisResult,       // Resultado da análise da IA
        metadata: {
          cnpj: cnpj,
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        }
      });

    } catch (error) {
      console.error("Erro:", error);
      return NextResponse.json(
        { error: "Erro ao processar a requisição" },
        { status: 500 }
      );
    }
  } catch (outerError) {
    console.error("Erro externo:", outerError);
    return NextResponse.json(
      { error: "Erro ao processar a requisição" },
      { status: 500 }
    );
  }
}