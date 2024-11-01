'use client';

import { useState } from 'react';
import { Wrapper } from './wrapper';
import Image from 'next/image';
import searchIcon from '@/assets/search.png';
import { CeisData, LenienciaData } from '@/@types/data';
import { formatDocument, transformDataCepim, transformDataCies, transformDataCnep, transformDataLeniencia } from '@/utils/formatData';

export const SearchCompanies = () => {
  const [document, setDocument] = useState('');
  const [isloading, setIsloading] = useState(false);
  const [data, setData] = useState<(CeisData | LenienciaData)[]>([]);
  const [errorInput, setErrorInput] = useState(false);
  const [noResults, setNoResults] = useState(false); // Estado para controlar se houve resultado

  const handleDocument = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedDocument = formatDocument(e.target.value);
    setErrorInput(false);
    setDocument(formattedDocument);
  };

  const fetchApisConcurrently = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsloading(true);
    setNoResults(false); // Resetar mensagem de erro antes da busca

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

      const [resultCeis, resultLeniencia, resultCnep, resultCepim, resultCeaf] = await Promise.all(
        responses.map(async (response, index) => {
          if (response.status === "fulfilled" && response.value.ok) {
            return response.value.json();
          } else {
            console.error(`Erro ao buscar dados da API ${["CEIS", "Leniencia", "CNEP", "CEPIM", "CEAF"][index]}`);
            return [];
          }
        })
      );

      const newDataCeis = transformDataCies(resultCeis as []);
      const newDataLeniencia = transformDataLeniencia(resultLeniencia as []);
      const newDataCnep = transformDataCnep(resultCnep as []);
      const newDataCepim = transformDataCepim(resultCepim as []);
  

      const allData = [
        ...newDataCeis,
        ...newDataLeniencia,
        ...newDataCnep,
        ...newDataCepim,
      ];

      setData(allData);

      if (allData.length === 0) {
        setNoResults(true); // Definir que não há resultados se os dados estiverem vazios
      }
    } catch (error) {
      setData([]);
      setNoResults(true); // Mostrar erro se ocorrer algum problema
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
          <div className="w-12 h-12  border-8 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* {noResults ? (
            <div className="w-full text-center text-red-500 font-bold">
              CNPJ não encontrado nas listas do portal da transparência.
            </div>
          ) : (
            data.map(item => (
              <Wrapper apiSearched={item.api} json={item} key={item.id} />
            ))
          )} */}
        </>
      )}
    </div>
  );
};
