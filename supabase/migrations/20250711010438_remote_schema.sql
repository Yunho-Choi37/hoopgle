create table "public"."2025 주말리그 선수기록" (
    "선수명" text,
    "선발여부" text,
    "등번호" bigint,
    "1Q 득점" text,
    "2Q 득점" text,
    "3Q 득점" text,
    "4Q 득점" bigint,
    "플레잉 타임" text,
    "2점슛 성공" bigint,
    "2점슛 시도" bigint,
    "2점 성공률(%)" bigint,
    "3점슛 성공" text,
    "3점슛 시도" bigint,
    "3점 성공률(%)" text,
    "필드골 성공률(%)" bigint,
    "자유투 성공" text,
    "자유투 시도" text,
    "자유투 성공률(%)" text,
    "공격 리바운드" bigint,
    "수비 리바운드" bigint,
    "총 리바운드" text,
    "어시스트" bigint,
    "스틸" text,
    "굿디펜스" text,
    "블록슛" text,
    "턴오버" bigint,
    "총 파울" text,
    "소속팀" text,
    "상대팀" text,
    "대회명" text default '2025 주말리그'::text
);


alter table "public"."2025 주말리그 선수기록" enable row level security;

grant delete on table "public"."2025 주말리그 선수기록" to "anon";

grant insert on table "public"."2025 주말리그 선수기록" to "anon";

grant references on table "public"."2025 주말리그 선수기록" to "anon";

grant select on table "public"."2025 주말리그 선수기록" to "anon";

grant trigger on table "public"."2025 주말리그 선수기록" to "anon";

grant truncate on table "public"."2025 주말리그 선수기록" to "anon";

grant update on table "public"."2025 주말리그 선수기록" to "anon";

grant delete on table "public"."2025 주말리그 선수기록" to "authenticated";

grant insert on table "public"."2025 주말리그 선수기록" to "authenticated";

grant references on table "public"."2025 주말리그 선수기록" to "authenticated";

grant select on table "public"."2025 주말리그 선수기록" to "authenticated";

grant trigger on table "public"."2025 주말리그 선수기록" to "authenticated";

grant truncate on table "public"."2025 주말리그 선수기록" to "authenticated";

grant update on table "public"."2025 주말리그 선수기록" to "authenticated";

grant delete on table "public"."2025 주말리그 선수기록" to "service_role";

grant insert on table "public"."2025 주말리그 선수기록" to "service_role";

grant references on table "public"."2025 주말리그 선수기록" to "service_role";

grant select on table "public"."2025 주말리그 선수기록" to "service_role";

grant trigger on table "public"."2025 주말리그 선수기록" to "service_role";

grant truncate on table "public"."2025 주말리그 선수기록" to "service_role";

grant update on table "public"."2025 주말리그 선수기록" to "service_role";

create policy "Enable read access for all users"
on "public"."2025 주말리그 선수기록"
as permissive
for select
to public
using (true);



