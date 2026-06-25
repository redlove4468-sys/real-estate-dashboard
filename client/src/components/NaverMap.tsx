/**
 * 네이버 지도 컴포넌트
 * - naver.maps SDK가 index.html에서 로드됨 (ncpKeyId=x5its2ja12)
 * - onMapReady 콜백으로 naver.maps.Map 인스턴스 전달
 */
import { useEffect, useRef } from 'react';

interface NaverMapProps {
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  onMapReady?: (map: naver.maps.Map) => void;
  className?: string;
}

export function NaverMapView({
  initialCenter = { lat: 37.5665, lng: 126.9780 },
  initialZoom = 13,
  onMapReady,
  className = 'w-full h-full',
}: NaverMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<naver.maps.Map | null>(null);
  const readyCalled = useRef(false);

  useEffect(() => {
    if (!containerRef.current || readyCalled.current) return;

    const initMap = () => {
      if (!containerRef.current) return;
      const map = new naver.maps.Map(containerRef.current, {
        center: new naver.maps.LatLng(initialCenter.lat, initialCenter.lng),
        zoom: initialZoom,
        mapTypeId: naver.maps.MapTypeId.NORMAL,
      });
      mapRef.current = map;
      readyCalled.current = true;
      if (onMapReady) onMapReady(map);
    };

    // SDK가 이미 로드된 경우
    if (window.naver && window.naver.maps) {
      initMap();
    } else {
      // SDK 로딩 대기
      const interval = setInterval(() => {
        if (window.naver && window.naver.maps) {
          clearInterval(interval);
          initMap();
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, []);

  return <div ref={containerRef} className={className} />;
}
