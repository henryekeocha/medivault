--
-- PostgreSQL database dump
--

-- Dumped from database version 14.15 (Homebrew)
-- Dumped by pg_dump version 14.15 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    email_verified timestamp(3) without time zone,
    image text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    role public."Role" DEFAULT 'Patient'::public."Role" NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, password, email_verified, image, created_at, updated_at, role) FROM stdin;
cm6oaxp4000001ksz37elmo3b	Test Patient	patient@test.com	$2a$10$kuqwc7mqZhlAIqB7DwW6yegIgluD/9z9uVP.yNqmVAvQMbCmnUr7e	\N	\N	2025-02-03 00:17:40.704	2025-02-03 00:17:40.704	Patient
cm6oaxp5n00011ksztf4ag1up	Test Provider	provider@test.com	$2a$10$TF6pPPLs4Spev5b99jaDGe5JZmSC.4qoXsCSyw1oGvBKq3bEF9faK	\N	\N	2025-02-03 00:17:40.764	2025-02-03 00:17:40.764	Provider
cm6oaxp7900021kszmzafkmga	Test Admin	admin@test.com	$2a$10$HOpXCoFUtHRoxWi5A9e66ebUmr910282gLRc9OhXnPaIfNpGNDLVK	\N	\N	2025-02-03 00:17:40.821	2025-02-03 00:17:40.821	Admin
\.


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- PostgreSQL database dump complete
--

