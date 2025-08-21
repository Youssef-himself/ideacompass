'use client';

import React, { useState } from 'react';
import { z } from 'zod';
import { searchSchema } from '@/lib/validation';

type Props = {
  onSearch: (keyword: string) => Promise<void>;
};

export default function SearchForm({ onSearch }: Props) {
  const [keyword, setKeyword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = searchSchema.safeParse({ keyword });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message || 'Invalid input');
      return;
    }

    setLoading(true);
    try {
      await onSearch(keyword);
    } catch (err: any) {
      setError(err?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md mx-auto p-4 flex flex-col gap-4 bg-white rounded shadow"
    >
      <label htmlFor="keyword" className="font-semibold text-gray-700">
        Search for business opportunities
      </label>
      <input
        id="keyword"
        type="text"
        className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        placeholder="Enter a keyword (e.g. startup, SaaS, AI)"
        value={keyword}
        onChange={e => setKeyword(e.target.value)}
        disabled={loading}
        autoFocus
      />
      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}
      <button
        type="submit"
        className="bg-blue-600 text-white rounded py-2 font-semibold hover:bg-blue-700 transition disabled:opacity-50"
        disabled={loading}
      >
        {loading ? 'Searching...' : 'Search'}
      </button>
    </form>
  );
}