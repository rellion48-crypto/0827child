-- ==========================================================================
-- BEST TAXI: Supabase Database Schema & Full Permission Policies
-- 장소 접수 ➔ 택시 배차 연계 실시간 데이터베이스 완전 스크립트 (PostgreSQL / Supabase)
-- ==========================================================================

-- 1. UUID 확장 모듈 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. 기존 테이블 및 정책 초기화 (안전한 재생성)
DROP TABLE IF EXISTS public.taxi_reservations CASCADE;
DROP TABLE IF EXISTS public.places CASCADE;

-- 3. 장소 테이블 (식당, 숙소, 관광지)
CREATE TABLE public.places (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain VARCHAR(20) NOT NULL DEFAULT '식당',    -- '식당', '숙소', '관광'
    name VARCHAR(100) NOT NULL UNIQUE,              -- 장소 이름 (예: '두부두부두부')
    region VARCHAR(50) NOT NULL DEFAULT '서울',     -- 지역
    place_type VARCHAR(50) DEFAULT '일반',          -- '한식당', '호스텔', '문화/관람' 등
    price_range VARCHAR(30) DEFAULT '적당',         -- '저렴', '적당', '비싼', '무료'
    address TEXT DEFAULT '서울시내 일원',           -- 주소
    phone VARCHAR(30) DEFAULT '02-120',             -- 연락처
    rating NUMERIC(2, 1) DEFAULT 4.5,               -- 평점
    near_station VARCHAR(100),                      -- 인근 지하철역
    tags TEXT[] DEFAULT '{}',                       -- 태그
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 택시 예약 및 배차 테이블 (장소 ➔ 택시 이월 연계)
CREATE TABLE public.taxi_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_code VARCHAR(30) NOT NULL UNIQUE,       -- 배차 예약번호 (예: 'TX-93806')
    place_id UUID REFERENCES public.places(id) ON DELETE SET NULL,
    place_name VARCHAR(100) NOT NULL,               -- 연계된 장소명
    place_domain VARCHAR(20) DEFAULT '식당',        -- 연계된 장소 도메인
    place_region VARCHAR(50) DEFAULT '서울',        -- 연계된 지역
    departure VARCHAR(100) NOT NULL,                -- 출발지 (예: '호텔 파크')
    destination VARCHAR(100) NOT NULL,              -- 도착지 (장소명에서 자동 이월됨)
    departure_time VARCHAR(50) NOT NULL,            -- 희망 출발 시간 (예: '14:30', '지금 바로')
    taxi_type VARCHAR(50) DEFAULT '일반 택시',       -- '일반 택시', '모범 택시', '고급 택시', '대형 밴', '무관'
    driver_phone VARCHAR(30) DEFAULT '010-8376-2540',-- 기사님 연락처
    estimated_fare INTEGER DEFAULT 14500,           -- 예상 요금 (원)
    estimated_duration INTEGER DEFAULT 25,          -- 예상 소요 시간 (분)
    status VARCHAR(30) DEFAULT '배차완료',           -- 상태 ('배차완료', '운행중', '도착')
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 조회 성능 최적화 인덱스 생성
CREATE INDEX idx_places_domain ON public.places(domain);
CREATE INDEX idx_places_name ON public.places(name);
CREATE INDEX idx_taxi_reservations_booking_code ON public.taxi_reservations(booking_code);
CREATE INDEX idx_taxi_reservations_created_at ON public.taxi_reservations(created_at DESC);

-- 6. RLS (Row Level Security) 설정 및 완전 개방 권한 부여 (웹/앱 실시간 쓰기/읽기 보장)
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxi_reservations ENABLE ROW LEVEL SECURITY;

-- 6-1. places 테이블: 누구나 조회(SELECT), 등록(INSERT), 수정(UPDATE), 삭제(DELETE) 가능
CREATE POLICY "Allow public all access on places" 
ON public.places FOR ALL 
TO public, anon, authenticated 
USING (true) 
WITH CHECK (true);

-- 6-2. taxi_reservations 테이블: 누구나 조회(SELECT), 등록(INSERT), 수정(UPDATE), 삭제(DELETE) 가능
CREATE POLICY "Allow public all access on taxi_reservations" 
ON public.taxi_reservations FOR ALL 
TO public, anon, authenticated 
USING (true) 
WITH CHECK (true);

-- 7. 초기 장소 기초 데이터 (Seed Data)
INSERT INTO public.places (domain, name, region, place_type, price_range, address, phone, rating, near_station, tags)
VALUES
    -- [식당 도메인]
    ('식당', '두부두부두부', '서울 동쪽', '한식당', '저렴', '서울 송파구 96349', '02-5558-7541', 4.5, '올림픽공원역 (도보 7분)', ARRAY['한식', '주류판매', '가성비']),
    ('식당', '주점부리', '서울 동쪽', '주점/포차', '저렴', '서울 광진구 41829', '02-4412-9821', 4.2, '건대입구역 (도보 4분)', ARRAY['주류판매', '심야영업']),
    ('식당', '명동 전통 불고기', '서울 중앙', '한식당', '적당', '서울 중구 명동길 88', '02-7788-1234', 4.7, '명동역 (도보 2분)', ARRAY['불고기', '외국인인기']),
    
    -- [숙소 도메인]
    ('숙소', '심미 호스텔', '서울 서쪽', '호스텔', '저렴', '서울 마포구 51203', '02-3344-9988', 4.6, '월드컵경기장역 (도보 3분)', ARRAY['조식제공', '역세권']),
    ('숙소', '에버뉴 호텔', '서울 동쪽', '호텔', '적당', '서울 광진구 61928', '02-4567-8901', 4.3, '건대입구역 (도보 5분)', ARRAY['스파시설', '주차가능']),
    ('숙소', '파크 호텔', '서울 동쪽', '호텔', '비싼', '서울 송파구 21999', '02-4111-7788', 4.8, '잠실역 (도보 6분)', ARRAY['럭셔리', '루프탑']),
    ('숙소', '체리 에어비앤비', '서울 중앙', '에어비앤비', '비싼', '서울 중구 충무로 14', '010-9988-1234', 4.5, '명동역 (도보 4분)', ARRAY['독채', '주방완비']),
    
    -- [관광 도메인]
    ('관광', '서울중앙성원', '서울 중앙', '문화/관람', '무료', '서울 용산구 우사단로 73', '02-793-6449', 4.6, '이태원역 (도보 8분)', ARRAY['입장료무료', '이색명소']),
    ('관광', '가로수길', '서울 남쪽', '쇼핑/거리', '무료', '서울 강남구 신사동', '02-3445-0114', 4.7, '신사역 (도보 10분)', ARRAY['쇼핑', '카페거리']),
    ('관광', '스타필드 코엑스몰', '서울 남쪽', '쇼핑/문화', '무료', '서울 강남구 영동대로 513', '02-6002-5300', 4.8, '삼성역 (직결)', ARRAY['별마당도서관', '대형몰'])
ON CONFLICT (name) DO NOTHING;

-- 8. 샘플 배차 데이터 1건 (이월 검증용 초기 데이터)
INSERT INTO public.taxi_reservations (booking_code, place_name, place_domain, place_region, departure, destination, departure_time, taxi_type, driver_phone, estimated_fare, estimated_duration)
VALUES
    ('TX-93806', '두부두부두부', '식당', '서울 동쪽', '호텔 파크', '두부두부두부', '14:30', '일반 택시', '010-8376-2540', 14500, 25)
ON CONFLICT (booking_code) DO NOTHING;
