'use client';

import { useState } from 'react';
import { Wrapper } from './wrapper';
import Image from 'next/image';
import searchIcon from '@/assets/search.png';
import { CeisData, LenienciaData } from '@/@types/data';
import { formatDocument, transformDataCeaf, transformDataCepim, transformDataCies, transformDataCnep, transformDataLeniencia, transformDataPep } from '@/utils/formatData';

export const SearchCompanies = () => {
  const [document, setDocument] = useState('');
  const [isloading, setIsloading] = useState(false);
  const [data, setData] = useState<(CeisData | LenienciaData)[]>([]);
  const [errorInput, setErrorInput] = useState(false);

  const handleDocument = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedDocument = formatDocument(e.target.value);
    setErrorInput(false);
    setDocument(formattedDocument);
  };

  const fetchApisConcurrently = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsloading(true);

    try {
      const ceisPromise = fetch(`/api/ceis?${document.length > 14 ? "cnpj" : "cpf"}=${document}`);
      const lenienciaPromise = fetch(`/api/leniencia?cnpj=${document}`);
      const cnepPromise = fetch(`/api/cnep?${document.length > 14 ? "cnpj" : "cpf"}=${document}`);
      const cepimPromise = fetch(`/api/cepim?cnpj=${document}`);
      const ceafPromise = fetch(`/api/ceaf?${document.length > 14 ? "cnpj" : "cpf"}=${document}`);
      const pepPromise = fetch(`/api/peps?cpf=${document}`);

      const responses = await Promise.allSettled([
        ceisPromise,
        lenienciaPromise,
        cnepPromise,
        cepimPromise,
        ceafPromise,
        pepPromise,
      ]);



      const [resultCeis, resultLeniencia, resultCnep, resultCepim, resultCeaf, resultPep] = await Promise.all(
        responses.map(async (response, index) => {
          if (response.status === "fulfilled" && response.value.ok) {
            return response.value.json();
          } else {
            console.error(`Erro ao buscar dados da API ${["CEIS", "Leniencia", "CNEP", "CEPIM", "CEAF", "PEP"][index]}`);
            return [];
          }
        })
      );

      const newDataCeis = transformDataCies(resultCeis as []);
      const newDataLeniencia = transformDataLeniencia(resultLeniencia as []);
      const newDataCnep = transformDataCnep(resultCnep as []);
      const newDataCepim = transformDataCepim(resultCepim as []);
      const newDataCeaf = transformDataCeaf(resultCeaf as []);
      const newDataPep = transformDataPep(resultPep as []);

      setData([
        ...newDataCeis,
        ...newDataLeniencia,
        ...newDataCnep,
        ...newDataCepim,
        ...newDataCeaf,
        ...newDataPep,
      ]);
    } catch (error) {
      setData([]);
      console.log("Erro ao processar dados", error);
    } finally {
      setIsloading(false);
    }
  };

  return (
    <div className="w-full h-auto bg-white flex flex-col gap-4">
      <div className="h-72 md:min-h-[600px] p-8 md:p-10 w-full flex flex-col gap-14 items-center justify-center bg-gradient-to-l from-[#1E4C78] to-[#1E4C78] via-[#1E4C78]">
        <h2 className="font-bold text-2xl md:text-4xl text-white">
          Busque por uma empresa
        </h2>
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
          {data.map(item => (
            <Wrapper apiSearched={item.api} json={item} key={item.id} />
          ))}
        </>
      )}
    </div>
  );
};
