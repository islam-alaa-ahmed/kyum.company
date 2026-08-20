-- Phase M15.25.3 — Al Ahsa Geography Verification
-- READ ONLY

-- 1) Exactly one active normalized Al Ahsa city should remain.
with eastern as (
  select id
  from public.installation_regions
  where national_address_region_id = 5
     or trim(name) = 'المنطقة الشرقية'
  order by (national_address_region_id = 5) desc, id
  limit 1
)
select
  c.id,
  c.name,
  c.national_address_city_id,
  c.is_active,
  count(n.id) filter (where n.is_active) as active_districts
from public.installation_cities c
join eastern e on e.id = c.region_id
left join public.installation_neighborhoods n on n.city_id = c.id
where lower(
  trim(
    regexp_replace(
      regexp_replace(
        replace(replace(replace(replace(c.name,'أ','ا'),'إ','ا'),'آ','ا'),'ٱ','ا'),
        '[ـً-ٰٟۖ-ۭ]','','g'
      ),
      '\s+',' ','g'
    )
  )
) = 'الاحساء'
group by c.id,c.name,c.national_address_city_id,c.is_active
order by c.is_active desc,c.national_address_city_id nulls last,c.id;


-- 2) PASS target:
-- active_ahsa_rows = 1
-- canonical_city_id = 3677
-- active_districts > 0
with eastern as (
  select id
  from public.installation_regions
  where national_address_region_id = 5
     or trim(name) = 'المنطقة الشرقية'
  order by (national_address_region_id = 5) desc, id
  limit 1
)
select
  count(*) filter (where c.is_active) as active_ahsa_rows,
  max(c.national_address_city_id) filter (where c.is_active) as canonical_city_id,
  count(n.id) filter (where c.is_active and n.is_active) as active_districts
from public.installation_cities c
join eastern e on e.id = c.region_id
left join public.installation_neighborhoods n on n.city_id = c.id
where lower(
  trim(
    regexp_replace(
      regexp_replace(
        replace(replace(replace(replace(c.name,'أ','ا'),'إ','ا'),'آ','ا'),'ٱ','ا'),
        '[ـً-ٰٟۖ-ۭ]','','g'
      ),
      '\s+',' ','g'
    )
  )
) = 'الاحساء';


-- 3) Show Al Ahsa district sample.
select
  c.name as city_name,
  n.id as neighborhood_id,
  n.name as neighborhood_name,
  n.name_en,
  n.national_address_district_id,
  n.is_active
from public.installation_cities c
join public.installation_neighborhoods n on n.city_id = c.id
where c.national_address_city_id = 3677
  and n.is_active
order by n.name
limit 50;


-- 4) No active duplicate Al Ahsa city should exist.
with eastern as (
  select id
  from public.installation_regions
  where national_address_region_id = 5
     or trim(name) = 'المنطقة الشرقية'
  order by (national_address_region_id = 5) desc, id
  limit 1
)
select count(*) as active_normalized_duplicate_rows
from public.installation_cities c
join eastern e on e.id = c.region_id
where c.is_active
  and lower(
    trim(
      regexp_replace(
        regexp_replace(
          replace(replace(replace(replace(c.name,'أ','ا'),'إ','ا'),'آ','ا'),'ٱ','ا'),
          '[ـً-ٰٟۖ-ۭ]','','g'
        ),
        '\s+',' ','g'
      )
    )
  ) = 'الاحساء';


-- 5) Existing source cities retain their own neighborhoods (regression).
select
  c.name as source_city,
  count(n.id) filter (where n.is_active) as active_districts
from public.installation_cities c
left join public.installation_neighborhoods n on n.city_id = c.id
where c.is_active
  and c.name in ('الهفوف','المبرز','العيون','العمران')
group by c.id,c.name
order by c.name;


-- 6) No orphan active Al Ahsa districts.
select
  n.id,n.name,n.city_id,n.region_id
from public.installation_neighborhoods n
left join public.installation_cities c on c.id = n.city_id
left join public.installation_regions r on r.id = n.region_id
where n.is_active
  and n.city_id = (
    select id from public.installation_cities
    where national_address_city_id = 3677
    order by id limit 1
  )
  and (c.id is null or r.id is null);
