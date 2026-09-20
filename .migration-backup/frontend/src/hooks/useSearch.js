import { useState, useEffect, useRef, useCallback } from 'react';
import { useDebounce } from './useDebounce';

export const useSearch = (searchFn, delay = 400, minLength = 2) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const debouncedQuery = useDebounce(query, delay);

  useEffect(() => {
    if (debouncedQuery.length < minLength) {
      setResults(null);
      setError(null);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);

    searchFn(debouncedQuery, controller.signal)
      .then((data) => {
        setResults(data);
        setIsLoading(false);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setError(err.message);
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [debouncedQuery, searchFn, minLength]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults(null);
    setError(null);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    clearSearch,
    isActive: debouncedQuery.length >= minLength,
  };
};
