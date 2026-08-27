-- ==========================================================================
-- BEST TAXI: Supabase Database Schema & Initial Seed Data
-- 장소 접수 ➔ 택시 배차 연계 플랫폼 스키마 (PostgreSQL / Supabase)
-- ==========================================================================

-- 1. 확장 기능 활성화 (UUID 생성용)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. 장소 테이블 (식당, 숙소, 관광지)
CREATE TABLE IF NOT EXISTS public.places (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain VARCHAR(20) NOT NULL,            -- '식당', '숙소', '관광'
    name VARCHAR(100) NOT NULL UNIQUE,      -- 장소 이름 (예: '두부두부두부')
    region VARCHAR(50) NOT NULL,            -- '서울 동쪽', '서울 서쪽', '서울 중앙' 등
    place_type VARCHAR(50) NOT NULL,        -- '한식당', '호스텔', '문화/관람' 등
    price_range VARCHAR(30) NOT NULL,       -- '저렴', '적당', '비싼', '무료'
    address TEXT,                           -- 주소 (예: '서울 송파구 96349')
    phone VARCHAR(30),                      -- 연락처
    rating NUMERIC(2, 1) DEFAULT 4.5,       -- 평점
    near_station VARCHAR(100),              -- 인근 지하철역
    tags TEXT[] DEFAULT '{}',               -- 태그 목록
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 택시 예약 및 배차 테이블 (장소 ➔ 택시 이월 연계)
CREATE TABLE IF NOT EXISTS public.taxi_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_code VARCHAR(20) NOT NULL UNIQUE,  -- 배차 코드 (예: 'TX-93806')
    place_id UUID REFERENCES public.places(id) ON DELETE SET NULL,
    place_name VARCHAR(100) NOT NULL,          -- 연계된 장소명
    place_domain VARCHAR(20),                  -- 연계된 장소 도메인
    place_region VARCHAR(50),                  -- 연계된 지역
    departure VARCHAR(100) NOT NULL,           -- 출발지 (예: '호텔 파크')
    destination VARCHAR(100) NOT NULL,         -- 도착지 (장소명에서 자동 이월됨)
    departure_time VARCHAR(20) NOT NULL,       -- 희망 출발 시간 (예: '14:30')
    taxi_type VARCHAR(30) DEFAULT '일반',       -- '일반', '모범', '고급', '대형', 'dontcare'
    driver_phone VARCHAR(30) NOT NULL,         -- 기사님 연락처
    estimated_fare INTEGER DEFAULT 14500,      -- 예상 요금 (원)
    estimated_duration INTEGER DEFAULT 25,     -- 예상 소요 시간 (분)
    status VARCHAR(30) DEFAULT '배차완료',      -- 상태
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 인덱스 생성 (조회 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_places_domain ON public.places(domain);
CREATE INDEX IF NOT EXISTS idx_places_region ON public.places(region);
CREATE INDEX IF NOT EXISTS idx_taxi_reservations_booking_code ON public.taxi_reservations(booking_code);

-- 5. RLS (Row Level Security) 정책 설정
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxi_reservations ENABLE ROW LEVEL SECURITY;

-- 누구나 장소 목록을 조회할 수 있도록 허용 (anon / authenticated)
CREATE POLICY "Allow public read access on places" 
ON public.places FOR SELECT 
USING (true);

-- 누구나 택시 예약을 조회할 수 있도록 허용
CREATE POLICY "Allow public read access on taxi_reservations" 
ON public.taxi_reservations FOR SELECT 
USING (true);

-- 누구나 택시 예약을 등록할 수 있도록 허용
CREATE POLICY "Allow public insert on taxi_reservations" 
ON public.taxi_reservations FOR INSERT 
WITH CHECK (true);

-- 6. 초기 장소 기초 데이터 (Seed Data) 삽입
INSERT INTO public.places (domain, name, region, place_type, price_range, address, phone, rating, near_station, tags)
VALUES
    -- [식당 도메인]
    ('식당', '두부두부두부', '서울 동쪽', '한식당', '저렴', '서울 송파구 96349', '02-5558-7541', 4.5, '올림픽공원역 (도보 7분)', ARRAY['한식', '주류판매', '예약가능']),
    ('식당', '주점부리', '서울 동쪽', '주점/포차', '저렴', '서울 광진구 41829', '02-4412-9821', 4.2, '건대입구역 (도보 4분)', ARRAY['주류판매', '가성비', '심야영업']),
    ('식당', '명동 전통 불고기', '서울 중앙', '한식당', '적당', '서울 중구 명동길 88', '02-7788-1234', 4.7, '명동역 (도보 2분)', ARRAY['불고기', '외국인인기', '개별룸']),
    
    -- [숙소 도메인]
    ('숙소', '심미 호스텔', '서울 서쪽', '호스텔', '저렴', '서울 마포구 51203', '02-3344-9988', 4.6, '월드컵경기장역 (도보 3분)', ARRAY['조식제공', '무료와이파이', '역세권']),
    ('숙소', '에버뉴 호텔', '서울 동쪽', '호텔', '적당', '서울 광진구 61928', '02-4567-8901', 4.3, '건대입구역 (도보 5분)', ARRAY['스파시설', '헬스장', '주차가능']),
    ('숙소', '파크 호텔', '서울 동쪽', '호텔', '비싼', '서울 송파구 21999', '02-4111-7788', 4.8, '잠실역 (도보 6분)', ARRAY['럭셔리', '스파', '루프탑']),
    ('숙소', '체리 에어비앤비', '서울 중앙', '에어비앤비', '비싼', '서울 중구 충무로 14', '010-9988-1234', 4.5, '명동역 (도보 4분)', ARRAY['독채', '주방완비']),
    
    -- [관광 도메인]
    ('관광', '서울중앙성원', '서울 중앙', '문화/관람', '무료', '서울 용산구 우사단로 73', '02-793-6449', 4.6, '이태원역 (도보 8분)', ARRAY['입장료무료', '교육적', '이색명소']),
    ('관광', '가로수길', '서울 남쪽', '쇼핑/거리', '무료', '서울 강남구 신사동', '02-3445-0114', 4.7, '신사역 (도보 10분)', ARRAY['쇼핑', '카페거리', '트렌드']),
    ('관광', '스타필드 코엑스몰', '서울 남쪽', '쇼핑/문화', '무료', '서울 강남구 영동대로 513', '02-6002-5300', 4.8, '삼성역 (직결)', ARRAY['별마당도서관', '대형쇼핑몰'])
ON CONFLICT (name) DO NOTHING;

-- 7. 샘플 배차 데이터 1건 삽입 (이월 검증용)
INSERT INTO public.taxi_reservations (booking_code, place_name, place_domain, place_region, departure, destination, departure_time, taxi_type, driver_phone, estimated_fare, estimated_duration)
VALUES
    ('TX-93806', '두부두부두부', '식당', '서울 동쪽', '호텔 파크', '두부두부두부', '14:30', '일반', '010-8376-2540', 14500, 25)
ON CONFLICT (booking_code) DO NOTHING;
