// Importação dos módulos necessários
import { NextResponse } from "next/server";
import dotenv from "dotenv";

// Configura as variáveis de ambiente do arquivo .env
dotenv.config();

/**
 * Handler para requisições GET
 * Esta função processa requisições para buscar informações de sanções e acordos de leniência
 * em diferentes APIs governamentais
 * @param request Objeto Request contendo os parâmetros da requisição
 */
export async function GET(request: Request) {
    try {
        // Extrai e limpa os parâmetros CNPJ e CPF da URL, removendo caracteres não numéricos
        const { searchParams } = new URL(request.url);
        const cnpj = searchParams.get("cnpj")?.replace(/[^\d]+/g, "");
        const cpf = searchParams.get("cpf")?.replace(/[^\d]+/g, "");

        // Valida se o CNPJ foi fornecido
        if (!cnpj) {
            return NextResponse.json(
                { error: "CNPJ não fornecido" },
                { status: 400 }
            );
        }

        // Obtém a chave da API das variáveis de ambiente
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "Chave da API não configurada." },
                { status: 500 }
            );
        }

        // Define as URLs para as diferentes APIs do Portal da Transparência
        // CEIS: Cadastro de Empresas Inidôneas e Suspensas
        const ceisUrl = `https://api.portaldatransparencia.gov.br/api-de-dados/ceis?codigoSancionado=${cnpj}&pagina=1`;
        // CNEP: Cadastro Nacional de Empresas Punidas
        const cnepUrl = `https://api.portaldatransparencia.gov.br/api-de-dados/cnep?codigoSancionado=${cnpj}&pagina=1`;
        // CEPIM: Cadastro de Entidades Privadas Sem Fins Lucrativos Impedidas
        const cepimUrl = `https://api.portaldatransparencia.gov.br/api-de-dados/cepim?cnpjSancionado=${cnpj}&pagina=1`;
        // Acordos de Leniência
        const acordosUrl = `https://api.portaldatransparencia.gov.br/api-de-dados/acordos-leniencia?cnpjSancionado=${cnpj}&pagina=1`;

        /**
         * Função auxiliar para fazer requisições às APIs do Portal da Transparência
         * @param url URL da API a ser consultada
         * @returns Array com os dados retornados ou array vazio em caso de erro
         */
        async function fetchPortalData(url: string) {
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "chave-api-dados": apiKey ?? "",
                    Accept: "application/json",
                },
            });

            if (!response.ok) {
                console.log(`Erro na requisição para ${url}: ${response.status}`);
                return [];
            }

            return await response.json();
        }

        // Faz as requisições para todas as APIs simultaneamente usando Promise.all
        // Isso melhora a performance ao executar as chamadas em paralelo
        const [ceisData, cnepData, cepimData, acordosData] = await Promise.all([
            fetchPortalData(ceisUrl),
            fetchPortalData(cnepUrl),
            fetchPortalData(cepimUrl),
            fetchPortalData(acordosUrl)
        ]);

        // Envia os dados coletados para análise em outro endpoint
        const analysisResponse = await fetch(new URL('/api/analyze-compliance', request.url), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ceisData: ceisData,
                cnepData: cnepData,
                cepimData: cepimData,
                acordosData: acordosData
            })
        });

        // Verifica se a análise foi bem-sucedida
        if (!analysisResponse.ok) {
            throw new Error('Falha ao obter análise');
        }

        // Verifica se existem acordos de leniência
        if (acordosData.length === 0) {
            console.log('CNPJ não encontrado nos acordos de leniência');
        }

        // Obtém o resultado da análise
        const analysisResult = await analysisResponse.json();

        // Retorna os dados coletados, o resultado da análise e metadados da requisição
        return NextResponse.json({
            data: {
                ceis: ceisData,
                cnep: cnepData,
                cepim: cepimData,
                acordos: acordosData
            },
            analysis: analysisResult,
            metadata: {
                cnpj: cnpj,
                timestamp: new Date().toISOString(),
                requestId: crypto.randomUUID() // Gera um ID único para a requisição
            }
        });

    } catch (error) {
        // Tratamento de erros geral
        console.error("Erro ao processar requisição:", error);
        return NextResponse.json(
            {
                error: "Erro ao processar a requisição",
                details: error instanceof Error ? error.message : "Erro desconhecido"
            },
            { status: 500 }
        );
    }
}