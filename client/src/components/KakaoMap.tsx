/**
 * 카카오 지도 컴포넌트
 * - kakao.maps SDK가 index.html에서 autoload=false로 로드됨
 * - kakao.maps.load() 콜백 안에서 지도 초기화
 */
import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    kakao: any;
  }
}

interface KakaoMapProps {
  style?: React.CSSProperties;
  className?: string;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  onMapReady?: (map: any) => void;
}

export function KakaoMapView({
  style,
  className,
  initialCenter = { lat: 37.5563, lng: 126.9236 }, // 마포구 중심
  initialZoom = 5,
  onMapReady,
}: KakaoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const onMapReadyRef = useRef(onMapReady);
  onMapReadyRef.current = onMapReady;

  useEffect(() => {
    const initMap = () => {
      if (!containerRef.current || mapRef.current) return;
      const map = new window.kakao.maps.Map(containerRef.current, {
        center: new window.kakao.maps.LatLng(initialCenter.lat, initialCenter.lng),
        level: initialZoom,
      });
      mapRef.current = map;
      onMapReadyRef.current?.(map);
    };

    const tryInit = () => {
      if (window.kakao && window.kakao.maps && window.kakao.maps.Map) {
        initMap();
      } else if (window.kakao && window.kakao.maps && window.kakao.maps.load) {
        window.kakao.maps.load(initMap);
      } else {
        // SDK 아직 로드 안 됨 - 폴링
        const timer = setInterval(() => {
          if (window.kakao && window.kakao.maps) {
            clearInterval(timer);
            window.kakao.maps.load(initMap);
          }
        }, 100);
        return () => clearInterval(timer);
      }
    };

    tryInit();
  }, []);

  return (
    <div
      ref={containerRef}
      style={style}
      className={className}
    />
  );
}
