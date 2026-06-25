import { useState, useEffect } from 'react';
import type { RdbData, KwonriItem, ClientItem, HistoryItem, ClientWork, RecommendItem, NameCard } from '@/lib/types';

// 업로드된 파일 URL 매핑 (영문명으로 재업로드)
const URLS = {
  권리: '/manus-storage/kwonri_0afa9198.json',
  TB_Client: '/manus-storage/client_6ba523bd.json',
  권리변동내역: '/manus-storage/kwonri_history_9f5ed475.json',
  고객추천물건: '/manus-storage/client_recommend_e2686ab3.json',
  고객작업: '/manus-storage/client_work_17240ed1.json',
  매물작업: '/manus-storage/kwonri_work_9f9a2cdc.json',
  TB_NameCard: '/manus-storage/namecard_28ed2861.json',
  고객담당자: '/manus-storage/manager_13ac026a.json',
  _kwonri_last_update: '/manus-storage/kwonri_last_update_04d6b441.json',
  _client_last_update: '/manus-storage/client_last_update_ae190d8c.json',
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

export interface RdbDataFull {
  권리: KwonriItem[];
  TB_Client: ClientItem[];
  권리변동내역: HistoryItem[];
  고객추천물건: RecommendItem[];
  고객작업: ClientWork[];
  매물작업: any[];
  TB_NameCard: NameCard[];
  고객담당자: any[];
  _kwonri_last_update: Record<string, string>;
  _client_last_update: Record<string, string>;
}

export function useRdbData() {
  const [data, setData] = useState<RdbDataFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    // 핵심 데이터 먼저 로드 (권리 + 고객), 나머지는 병렬로
    Promise.all([
      fetchJson<KwonriItem[]>(URLS.권리),
      fetchJson<ClientItem[]>(URLS.TB_Client),
      fetchJson<HistoryItem[]>(URLS.권리변동내역),
      fetchJson<RecommendItem[]>(URLS.고객추천물건),
      fetchJson<any[]>(URLS.고객작업),
      fetchJson<any[]>(URLS.매물작업),
      fetchJson<NameCard[]>(URLS.TB_NameCard),
      fetchJson<any[]>(URLS.고객담당자),
      fetchJson<Record<string, string>>(URLS._kwonri_last_update),
      fetchJson<Record<string, string>>(URLS._client_last_update),
    ])
      .then(([권리, TB_Client, 권리변동내역, 고객추천물건, 고객작업, 매물작업, TB_NameCard, 고객담당자, _kwonri_last_update, _client_last_update]) => {
        setData({
          권리,
          TB_Client,
          권리변동내역,
          고객추천물건,
          고객작업,
          매물작업,
          TB_NameCard,
          고객담당자,
          _kwonri_last_update,
          _client_last_update,
        });
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { data, loading, error };
}
