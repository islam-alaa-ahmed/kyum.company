-- Phase M15.25.3 — Al Ahsa Canonical Geography Repair
-- Scope:
--   * Eastern Province / Al Ahsa only.
--   * Keep the National Address-backed Al Ahsa city row (national_address_city_id = 3677).
--   * Remove the active duplicate caused by Arabic hamza spelling differences.
--   * Materialize an application-level Al Ahsa district catalog from the four
--     principal Al Ahsa cities already present in the Saudi National Address seed:
--       الهفوف، المبرز، العيون، العمران
--
-- IMPORTANT:
-- The original National Address district rows remain attached to their original
-- city rows. Al Ahsa receives local alias rows with national_address_district_id NULL,
-- so the global National Address unique-id invariant is preserved.

begin;

do $$
declare
  v_region_id uuid;
  v_ahsa_city_id uuid;
  v_ahsa_city_name text;
  legacy_city record;
  legacy_neighborhood record;
  matching_neighborhood_id uuid;
begin
  select r.id
    into v_region_id
  from public.installation_regions r
  where r.national_address_region_id = 5
     or trim(r.name) = 'المنطقة الشرقية'
  order by (r.national_address_region_id = 5) desc, r.id
  limit 1;

  if v_region_id is null then
    raise exception 'المنطقة الشرقية غير موجودة في installation_regions';
  end if;

  -- Canonical Al Ahsa = the National Address-backed row.
  select c.id, c.name
    into v_ahsa_city_id, v_ahsa_city_name
  from public.installation_cities c
  where c.region_id = v_region_id
    and c.national_address_city_id = 3677
  order by c.id
  limit 1;

  if v_ahsa_city_id is null then
    insert into public.installation_cities(
      region_id, name, national_address_city_id, name_en, is_active
    )
    values(
      v_region_id, 'الاحساء', 3677, 'Al Ahsa', true
    )
    returning id, name into v_ahsa_city_id, v_ahsa_city_name;
  else
    update public.installation_cities
       set is_active = true,
           name_en = coalesce(nullif(name_en,''), 'Al Ahsa')
     where id = v_ahsa_city_id;
  end if;

  -- Merge/deactivate any active Al Ahsa duplicates whose only distinction is
  -- Arabic spelling/hamza normalization.
  for legacy_city in
    select c.id, c.name
    from public.installation_cities c
    where c.region_id = v_region_id
      and c.id <> v_ahsa_city_id
      and lower(
        trim(
          regexp_replace(
            regexp_replace(
              replace(replace(replace(replace(c.name,'أ','ا'),'إ','ا'),'آ','ا'),'ٱ','ا'),
              '[ـً-ٰٟۖ-ۭ]',
              '',
              'g'
            ),
            '\s+',
            ' ',
            'g'
          )
        )
      ) = 'الاحساء'
  loop
    -- Preserve any legacy neighborhoods safely. If the canonical city already
    -- contains an equivalent district name, repoint installation requests to it.
    for legacy_neighborhood in
      select n.id, n.name
      from public.installation_neighborhoods n
      where n.city_id = legacy_city.id
    loop
      select n2.id
        into matching_neighborhood_id
      from public.installation_neighborhoods n2
      where n2.city_id = v_ahsa_city_id
        and lower(
          trim(
            regexp_replace(
              regexp_replace(
                replace(replace(replace(replace(n2.name,'أ','ا'),'إ','ا'),'آ','ا'),'ٱ','ا'),
                '[ـً-ٰٟۖ-ۭ]',
                '',
                'g'
              ),
              '\s+',
              ' ',
              'g'
            )
          )
        ) =
        lower(
          trim(
            regexp_replace(
              regexp_replace(
                replace(replace(replace(replace(legacy_neighborhood.name,'أ','ا'),'إ','ا'),'آ','ا'),'ٱ','ا'),
                '[ـً-ٰٟۖ-ۭ]',
                '',
                'g'
              ),
              '\s+',
              ' ',
              'g'
            )
          )
        )
      order by n2.id
      limit 1;

      if matching_neighborhood_id is not null then
        update public.installation_requests
           set neighborhood_id = matching_neighborhood_id
         where neighborhood_id = legacy_neighborhood.id;

        delete from public.installation_neighborhoods
         where id = legacy_neighborhood.id;
      else
        update public.installation_neighborhoods
           set city_id = v_ahsa_city_id,
               region_id = v_region_id,
               city = v_ahsa_city_name,
               region = 'المنطقة الشرقية',
               is_active = true,
               updated_at = now()
         where id = legacy_neighborhood.id;
      end if;
    end loop;

    -- No remaining FK should point to installation_cities except neighborhoods.
    update public.installation_cities
       set is_active = false
     where id = legacy_city.id;
  end loop;
end $$;


-- ---------------------------------------------------------------------------
-- Build the application-level Al Ahsa district catalog.
--
-- Saudi geography represents the Al Ahsa governorate through multiple cities.
-- For the KYUM customer form, users select "الاحساء" as the business city.
-- Therefore we expose a non-destructive aggregate of district names from the
-- four principal Al Ahsa cities, while keeping their source rows unchanged.
-- ---------------------------------------------------------------------------

with eastern as (
  select r.id as region_id
  from public.installation_regions r
  where r.national_address_region_id = 5
     or trim(r.name) = 'المنطقة الشرقية'
  order by (r.national_address_region_id = 5) desc, r.id
  limit 1
),
ahsa as (
  select c.id as city_id, c.name as city_name, c.region_id
  from public.installation_cities c
  join eastern e on e.region_id = c.region_id
  where c.national_address_city_id = 3677
  order by c.id
  limit 1
),
source_rows as (
  select
    n.name,
    n.name_en,
    c.name as source_city_name,
    row_number() over (
      partition by lower(
        trim(
          regexp_replace(
            regexp_replace(
              replace(replace(replace(replace(n.name,'أ','ا'),'إ','ا'),'آ','ا'),'ٱ','ا'),
              '[ـً-ٰٟۖ-ۭ]',
              '',
              'g'
            ),
            '\s+',
            ' ',
            'g'
          )
        )
      )
      order by
        case c.name
          when 'الهفوف' then 1
          when 'المبرز' then 2
          when 'العيون' then 3
          when 'العمران' then 4
          else 9
        end,
        n.national_address_district_id nulls last,
        n.id
    ) as rn
  from public.installation_neighborhoods n
  join public.installation_cities c on c.id = n.city_id
  join eastern e on e.region_id = c.region_id
  where n.is_active
    and c.is_active
    and c.name in ('الهفوف','المبرز','العيون','العمران')
),
missing as (
  select s.name, s.name_en
  from source_rows s
  join ahsa a on true
  where s.rn = 1
    and not exists (
      select 1
      from public.installation_neighborhoods existing
      where existing.city_id = a.city_id
        and lower(
          trim(
            regexp_replace(
              regexp_replace(
                replace(replace(replace(replace(existing.name,'أ','ا'),'إ','ا'),'آ','ا'),'ٱ','ا'),
                '[ـً-ٰٟۖ-ۭ]',
                '',
                'g'
              ),
              '\s+',
              ' ',
              'g'
            )
          )
        ) =
        lower(
          trim(
            regexp_replace(
              regexp_replace(
                replace(replace(replace(replace(s.name,'أ','ا'),'إ','ا'),'آ','ا'),'ٱ','ا'),
                '[ـً-ٰٟۖ-ۭ]',
                '',
                'g'
              ),
              '\s+',
              ' ',
              'g'
            )
          )
        )
    )
)
insert into public.installation_neighborhoods(
  name,
  name_en,
  region,
  city,
  region_id,
  city_id,
  national_address_district_id,
  is_active
)
select
  m.name,
  m.name_en,
  'المنطقة الشرقية',
  a.city_name,
  a.region_id,
  a.city_id,
  null,
  true
from missing m
cross join ahsa a;


-- Keep all Al Ahsa alias text consistent with the canonical row.
with ahsa as (
  select c.id, c.region_id, c.name
  from public.installation_cities c
  where c.national_address_city_id = 3677
  order by c.id
  limit 1
)
update public.installation_neighborhoods n
   set region_id = a.region_id,
       city = a.name,
       region = 'المنطقة الشرقية',
       is_active = true,
       updated_at = now()
from ahsa a
where n.city_id = a.id
  and (
    n.region_id is distinct from a.region_id
    or n.city is distinct from a.name
    or n.region is distinct from 'المنطقة الشرقية'
    or not n.is_active
  );

analyze public.installation_cities;
analyze public.installation_neighborhoods;

commit;
