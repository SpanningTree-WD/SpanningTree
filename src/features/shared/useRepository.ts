import { useEffect, useState } from 'react'
export function useRepository<T>(load:()=>Promise<T>,dependencies:unknown[]){const [data,setData]=useState<T>();const [error,setError]=useState(false);useEffect(()=>{let active=true;setError(false);load().then(value=>{if(active)setData(value)}).catch(()=>{if(active)setError(true)});return()=>{active=false}},dependencies);return {data,error}}
