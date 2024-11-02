// Importa os tipos `CeisData` e `LenienciaData`, que são usados para tipar as transformações dos dados.
import { CeisData, LenienciaData } from "@/@types/data";

// Função para transformar dados do tipo CEIS.
export const transformDataCies = (ceisData: any[]): CeisData[] => {
  // Mapeia cada item de `ceisData` para o formato `CeisData`, retornando um array no formato correto.
  return ceisData.map((originalData) => ({
    id: originalData.id,
    api: "CEIS", // Nome da API que originou os dados.
    dataInicioSancao: originalData.dataInicioSancao,
    dataFimSancao: originalData.dataFimSancao,
    descricaoResumida: originalData.tipoSancao.descricaoResumida,
    nomeExibicao: originalData.fonteSancao.nomeExibicao,
    descricao: originalData.fundamentacao[0]?.descricao || "Sem descrição",
    sancionadoNome: originalData.sancionado.nome,
    cnpjFormatado: originalData.sancionado.codigoFormatado,
    numeroProcesso: originalData.numeroProcesso,
  }));
};

// Função para transformar dados do tipo Leniencia.
export const transformDataLeniencia = (lenienciaData: any[]): LenienciaData[] => {
  // Mapeia cada item de `lenienciaData` para o formato `LenienciaData`, retornando um array no formato correto.
  return lenienciaData.map((originalData) => ({
    id: originalData.id,
    api: "leniencia", // Nome da API que originou os dados.
    dataInicioAcordo: originalData.dataInicioAcordo,
    dataFimAcordo: originalData.dataFimAcordo,
    orgaoResponsavel: originalData.orgaoResponsavel,
    situacaoAcordo: originalData.situacaoAcordo,
    sancoes: [
      {
        nomeInformadoOrgaoResponsavel: originalData.sancoes[0].nomeInformadoOrgaoResponsavel,
        razaoSocial: originalData.sancoes[0].razaoSocial,
        cnpjFormatado: originalData.sancoes[0].cnpjFormatado,
      },
    ],
  }));
};

// Função para transformar dados do tipo CNEP.
export const transformDataCnep = (cnepData: any[]): any[] => {
  // Mapeia cada item de `cnepData` para incluir o identificador da API "Cnep".
  return cnepData.map((originalData) => ({
    id: originalData.id,
    api: "Cnep", // Nome da API que originou os dados.
    ...originalData, // Inclui todos os campos originais do `cnepData`.
  }));
};

// Função para transformar dados do tipo CEPIM.
export const transformDataCepim = (cepimData: any[]): any[] => {
  // Mapeia cada item de `cepimData` para incluir o identificador da API "Cepim".
  return cepimData.map((originalData) => ({
    id: originalData.id,
    api: "Cepim", // Nome da API que originou os dados.
    ...originalData, // Inclui todos os campos originais do `cepimData`.
  }));
};

// Função para transformar dados do tipo CEAF.
export const transformDataCeaf = (ceafData: any[]): any[] => {
  // Mapeia cada item de `ceafData` para incluir o identificador da API "Ceaf".
  return ceafData.map((originalData) => ({
    id: originalData.id,
    api: "Ceaf", // Nome da API que originou os dados.
    ...originalData, // Inclui todos os campos originais do `ceafData`.
  }));
};

// Função para formatar um documento (CPF ou CNPJ) baseado no número de dígitos.
export const formatDocument = (value: string): string => {
  // Remove todos os caracteres não numéricos.
  const numbersOnly = value.replace(/\D/g, "");

  // Se o número tem até 11 dígitos, assume que é um CPF e aplica a formatação correspondente.
  if (numbersOnly.length <= 11) {
    if (numbersOnly.length <= 3) return numbersOnly;
    if (numbersOnly.length <= 6) return `${numbersOnly.slice(0, 3)}.${numbersOnly.slice(3)}`;
    if (numbersOnly.length <= 9) return `${numbersOnly.slice(0, 3)}.${numbersOnly.slice(3, 6)}.${numbersOnly.slice(6)}`;
    return `${numbersOnly.slice(0, 3)}.${numbersOnly.slice(3, 6)}.${numbersOnly.slice(6, 9)}-${numbersOnly.slice(9, 11)}`;
  } else {
    // Caso contrário, assume que o número é um CNPJ e aplica a formatação para CNPJ.
    if (numbersOnly.length <= 2) return numbersOnly;
    if (numbersOnly.length <= 5) return `${numbersOnly.slice(0, 2)}.${numbersOnly.slice(2)}`;
    if (numbersOnly.length <= 8) return `${numbersOnly.slice(0, 2)}.${numbersOnly.slice(2, 5)}.${numbersOnly.slice(5)}`;
    if (numbersOnly.length <= 12) return `${numbersOnly.slice(0, 2)}.${numbersOnly.slice(2, 5)}.${numbersOnly.slice(5, 8)}/${numbersOnly.slice(8)}`;
    return `${numbersOnly.slice(0, 2)}.${numbersOnly.slice(2, 5)}.${numbersOnly.slice(5, 8)}/${numbersOnly.slice(8, 12)}-${numbersOnly.slice(12, 14)}`;
  }
};
