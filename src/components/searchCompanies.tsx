'use client';

import { useState } from 'react';
import { Wrapper } from './wrapper';
import Image from 'next/image';
import searchIcon from '@/assets/search.png';
import { CeisData, LenienciaData } from '@/@types/data';
import { formatDocument, transformDataCepim, transformDataCies, transformDataCnep, transformDataLeniencia } from '@/utils/formatData';
import { AnalysisResult } from '../app/api/analyze-compliance/route';

export const SearchCompanies = () => {
  const [document, setDocument] = useState('');
  const [isloading, setIsloading] = useState(false);
  const [portalData, setData] = useState<(CeisData | LenienciaData)[]>([]);
  const [errorInput, setErrorInput] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const handleDocument = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedDocument = formatDocument(e.target.value);
    setErrorInput(false);
    setDocument(formattedDocument);
  };

  const fetchApisConcurrently = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsloading(true);
    setNoResults(false);
    setAnalysisResult(null);

    try {
      const ceisPromise = fetch(`/api/ceis?${document.length > 14 ? "cnpj" : "cpf"}=${document}`);
      const lenienciaPromise = fetch(`/api/leniencia?cnpj=${document}`);
      const cnepPromise = fetch(`/api/cnep?${document.length > 14 ? "cnpj" : "cpf"}=${document}`);
      const cepimPromise = fetch(`/api/cepim?cnpj=${document}`);

      const responses = await Promise.allSettled([
        ceisPromise,
        lenienciaPromise,
        cnepPromise,
        cepimPromise,
      ]);

      const [resultCeis, resultLeniencia, resultCnep, resultCepim] = await Promise.all(
        responses.map(async (response, index) => {
          if (response.status === "fulfilled" && response.value.ok) {
            return response.value.json();
          } else {
            console.error(`Erro ao buscar dados da API ${["CEIS", "Leniencia", "CNEP", "CEPIM"][index]}`);
            return [];
          }
        })
      );

      const newDataCeis = transformDataCies(resultCeis as []);
      const newDataLeniencia = transformDataLeniencia(resultLeniencia as []);
      const newDataCnep = transformDataCnep(resultCnep as []);
      const newDataCepim = transformDataCepim(resultCepim as []);

      // Agrupar todos os dados transformados em uma única lista
      const allData = [
        ...newDataCeis,
        ...newDataLeniencia,
        ...newDataCnep,
        ...newDataCepim,
      ];

      setData(allData);

      // Verificar se todos os dados estão vazios
      setNoResults(allData.length === 0);

      // Solicitar análise dos dados se houver dados para análise
      if (allData.length > 0) {
        const analysisResponse = await fetch('/api/analyze-compliance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ceisData: resultCeis,
            cnepData: resultCnep,
            cepimData: resultCepim,
            acordosData: resultLeniencia
          })
        });

        if (analysisResponse.ok) {
          const analysis = await analysisResponse.json();
          setAnalysisResult(analysis);
        }
      }
    } catch (error) {
      setData([]);
      setNoResults(true);
      console.log("Erro ao processar dados", error);
    } finally {
      setIsloading(false);
    }
  };

  return (
    <div className="w-full h-auto bg-white flex flex-col gap-4">
      <div className="h-72 md:min-h-[600px] p-8 md:p-10 w-full flex flex-col gap-14 items-center justify-center bg-gradient-to-l from-[#1E4C78] to-[#1E4C78] via-[#1E4C78]">
        <h2 className="font-bold text-2xl md:text-4xl text-white">
          🧠 Bem-vindo ao Inteli Diligence 🧠
        </h2>
        <p className="mt-[-30px] text-[25px] font-bold">
          Insira um CNPJ para iniciar sua pesquisa
        </p>
        
        <form
          className="relative w-auto flex items-center justify-center"
          onSubmit={fetchApisConcurrently}
        >
          <input
            placeholder="Buscar..."
            type="text"
            value={document}
            onChange={handleDocument}
            maxLength={18}
            className={`w-[300px] md:w-[700px] h-14 rounded-xl border ${errorInput ? "border-red-500" : "border-black"} pl-8 bg-white outline-none text-black`}
          />

          <button className="absolute right-0 mr-5">
            <Image src={searchIcon} alt="search" width={20} height={20} />
          </button>
        </form>
      </div>

      {isloading ? (
        <div className="h-28 w-full flex items-center justify-center">
          <div className="w-12 h-12 border-8 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="flex flex-col gap-6 p-8">
          <div className="grid grid-cols-1 gap-6">
            {portalData.map(item => (
              <Wrapper apiSearched={item.api} json={item} key={item.id} />
            ))}
          </div>

          {analysisResult && (
            <div className="mt-8 bg-white rounded-lg shadow-lg p-6 border border-gray-200">
              <h3 className="text-2xl font-bold mb-4 text-[#1E4C78]">Parecer Final da Análise</h3>
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap font-normal text-gray-700">
                  {analysisResult.aiAnalysis}
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-500">
                <p>ID da Análise: {analysisResult.requestId}</p>
                <p>Data da Análise: {new Date(analysisResult.timestamp).toLocaleString()}</p>
                <p>Modelo Utilizado: {analysisResult.metadata.model}</p>
              </div>
            </div>
          )}

          {noResults && (
            <div className="w-full text-center text-red-500 font-bold">
              CNPJ não encontrado nas listas do portal da transparência.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
