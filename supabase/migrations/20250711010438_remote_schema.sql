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

-- 프로필 테이블 생성
create table if not exists "public"."profiles" (
    "id" uuid references auth.users on delete cascade primary key,
    "username" text,
    "avatar_url" text,
    "created_at" timestamp with time zone default timezone('utc'::text, now()) not null,
    "updated_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 메시지 테이블 생성
create table if not exists "public"."messages" (
    "id" uuid default gen_random_uuid() primary key,
    "content" text not null,
    "user_id" uuid references "public"."profiles"(id) on delete cascade not null,
    "channel" text not null,
    "created_at" timestamp with time zone default timezone('utc'::text, now()) not null,
    "updated_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 메시지 반응 테이블 생성
create table if not exists "public"."message_reactions" (
    "id" uuid default gen_random_uuid() primary key,
    "message_id" uuid references "public"."messages"(id) on delete cascade not null,
    "user_id" uuid references "public"."profiles"(id) on delete cascade not null,
    "reaction_type" text not null check (reaction_type in ('like', 'laugh', 'cry')),
    "created_at" timestamp with time zone default timezone('utc'::text, now()) not null,
    unique("message_id", "user_id", "reaction_type")
);

-- 댓글 테이블 생성
create table if not exists "public"."message_replies" (
    "id" uuid default gen_random_uuid() primary key,
    "message_id" uuid references "public"."messages"(id) on delete cascade not null,
    "user_id" uuid references "public"."profiles"(id) on delete cascade not null,
    "content" text not null,
    "created_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS 활성화
alter table "public"."profiles" enable row level security;
alter table "public"."messages" enable row level security;
alter table "public"."message_reactions" enable row level security;
alter table "public"."message_replies" enable row level security;

-- 권한 부여
grant all privileges on table "public"."profiles" to "anon", "authenticated", "service_role";
grant all privileges on table "public"."messages" to "anon", "authenticated", "service_role";
grant all privileges on table "public"."message_reactions" to "anon", "authenticated", "service_role";
grant all privileges on table "public"."message_replies" to "anon", "authenticated", "service_role";

-- 프로필 테이블 정책
create policy "Public profiles are viewable by everyone"
on profiles for select
using (true);

create policy "Users can insert their own profile"
on profiles for insert
with check (auth.uid() = id);

create policy "Users can update own profile"
on profiles for update
using (auth.uid() = id);

-- 메시지 테이블 정책
create policy "Messages are viewable by everyone"
on messages for select
using (true);

create policy "Authenticated users can insert messages"
on messages for insert
with check (auth.uid() = user_id);

create policy "Users can update own messages"
on messages for update
using (auth.uid() = user_id);

create policy "Users can delete own messages"
on messages for delete
using (auth.uid() = user_id);

-- 메시지 반응 테이블 정책
create policy "Message reactions are viewable by everyone"
on message_reactions for select
using (true);

create policy "Authenticated users can insert reactions"
on message_reactions for insert
with check (auth.uid() = user_id);

create policy "Users can delete own reactions"
on message_reactions for delete
using (auth.uid() = user_id);

-- 댓글 테이블 정책
create policy "Message replies are viewable by everyone"
on message_replies for select
using (true);

create policy "Authenticated users can insert replies"
on message_replies for insert
with check (auth.uid() = user_id);

create policy "Users can delete own replies"
on message_replies for delete
using (auth.uid() = user_id);

-- RLS 활성화
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



