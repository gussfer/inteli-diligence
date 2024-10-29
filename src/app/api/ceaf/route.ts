import { NextResponse } from "next/server";
import dotenv from "dotenv";

dotenv.config(); // Carrega as variáveis de ambiente

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cnpj = searchParams.get("cnpj")?.replace(/[^\d]+/g, "");
  const cpf = searchParams.get("cpf")?.replace(/[^\d]+/g, "");

  const apiKey = process.env.API_KEY;
  const url = `https://api.portaldatransparencia.gov.br/api-de-dados/ceaf?cpfSancionado=${
    !cnpj ? "cnpj" : "cpf"
  }=${!cnpj ? cnpj : cpf}&pagina=1`;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Chave da API não configurada." },
      { status: 500 }
    );
  }

  try {
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

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro:", error);
    return NextResponse.json(
      { error: "Erro ao processar a requisição" },
      { status: 500 }
    );
  }
}
