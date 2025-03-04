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

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: chat_messages_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.chat_messages_status_enum AS ENUM (
    'SENT',
    'DELIVERED',
    'READ'
);


ALTER TYPE public.chat_messages_status_enum OWNER TO postgres;

--
-- Name: chat_messages_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.chat_messages_type_enum AS ENUM (
    'USER',
    'BOT'
);


ALTER TYPE public.chat_messages_type_enum OWNER TO postgres;

--
-- Name: health_metric_metrictype_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.health_metric_metrictype_enum AS ENUM (
    'BLOOD_PRESSURE',
    'HEART_RATE',
    'TEMPERATURE',
    'BLOOD_SUGAR',
    'WEIGHT',
    'HEIGHT',
    'BMI',
    'OTHER'
);


ALTER TYPE public.health_metric_metrictype_enum OWNER TO postgres;

--
-- Name: medical_record_recordtype_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.medical_record_recordtype_enum AS ENUM (
    'DIAGNOSIS',
    'TREATMENT',
    'PRESCRIPTION',
    'LAB_RESULT',
    'IMAGING',
    'NOTE',
    'OTHER'
);


ALTER TYPE public.medical_record_recordtype_enum OWNER TO postgres;

--
-- Name: user_role_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role_enum AS ENUM (
    'Patient',
    'Provider',
    'Admin'
);


ALTER TYPE public.user_role_enum OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: annotation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.annotation (
    id integer NOT NULL,
    "imageId" integer NOT NULL,
    x double precision NOT NULL,
    y double precision NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    text text NOT NULL
);


ALTER TABLE public.annotation OWNER TO postgres;

--
-- Name: annotation_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.annotation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.annotation_id_seq OWNER TO postgres;

--
-- Name: annotation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.annotation_id_seq OWNED BY public.annotation.id;


--
-- Name: appointment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.appointment (
    id integer NOT NULL,
    "doctorId" integer NOT NULL,
    "startTime" timestamp without time zone NOT NULL,
    "endTime" timestamp without time zone NOT NULL,
    status text NOT NULL,
    notes text,
    "imageId" integer,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "patientId" uuid
);


ALTER TABLE public.appointment OWNER TO postgres;

--
-- Name: appointment_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.appointment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.appointment_id_seq OWNER TO postgres;

--
-- Name: appointment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.appointment_id_seq OWNED BY public.appointment.id;


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_log (
    id integer NOT NULL,
    details jsonb,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL,
    action text NOT NULL,
    "userId" uuid
);


ALTER TABLE public.audit_log OWNER TO postgres;

--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.audit_log_id_seq OWNER TO postgres;

--
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "sessionId" text NOT NULL,
    type public.chat_messages_type_enum NOT NULL,
    content text NOT NULL,
    status public.chat_messages_status_enum DEFAULT 'SENT'::public.chat_messages_status_enum NOT NULL,
    metadata jsonb,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    session_id uuid
);


ALTER TABLE public.chat_messages OWNER TO postgres;

--
-- Name: chat_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_sessions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    metadata jsonb NOT NULL,
    "startedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "endedAt" timestamp without time zone,
    user_id integer,
    "userId" uuid
);


ALTER TABLE public.chat_sessions OWNER TO postgres;

--
-- Name: health_metric; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.health_metric (
    id integer NOT NULL,
    "doctorId" integer,
    "metricType" public.health_metric_metrictype_enum NOT NULL,
    value double precision NOT NULL,
    unit text,
    metadata jsonb,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL,
    "patientId" uuid
);


ALTER TABLE public.health_metric OWNER TO postgres;

--
-- Name: health_metric_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.health_metric_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.health_metric_id_seq OWNER TO postgres;

--
-- Name: health_metric_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.health_metric_id_seq OWNED BY public.health_metric.id;


--
-- Name: image; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.image (
    id integer NOT NULL,
    metadata jsonb NOT NULL,
    size integer,
    "uploadedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    filename text NOT NULL,
    "s3Key" text NOT NULL,
    "s3Url" text NOT NULL,
    "userId" uuid
);


ALTER TABLE public.image OWNER TO postgres;

--
-- Name: image_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.image_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.image_id_seq OWNER TO postgres;

--
-- Name: image_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.image_id_seq OWNED BY public.image.id;


--
-- Name: medical_record; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.medical_record (
    id integer NOT NULL,
    "doctorId" integer NOT NULL,
    "recordType" public.medical_record_recordtype_enum NOT NULL,
    description text NOT NULL,
    data jsonb NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    metadata jsonb,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "patientId" uuid
);


ALTER TABLE public.medical_record OWNER TO postgres;

--
-- Name: medical_record_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.medical_record_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.medical_record_id_seq OWNER TO postgres;

--
-- Name: medical_record_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.medical_record_id_seq OWNED BY public.medical_record.id;


--
-- Name: message; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.message (
    id integer NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "isEdited" boolean DEFAULT false NOT NULL,
    "readAt" timestamp without time zone,
    content text NOT NULL,
    "senderId" uuid,
    "recipientId" uuid
);


ALTER TABLE public.message OWNER TO postgres;

--
-- Name: message_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.message_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.message_id_seq OWNER TO postgres;

--
-- Name: message_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.message_id_seq OWNED BY public.message.id;


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    "timestamp" bigint NOT NULL,
    name character varying NOT NULL
);


ALTER TABLE public.migrations OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.migrations_id_seq OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    type text NOT NULL,
    content text NOT NULL,
    read boolean DEFAULT false NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer,
    "userId" uuid
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: patient_provider; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.patient_provider (
    id integer NOT NULL,
    "isActive" boolean DEFAULT false NOT NULL,
    metadata jsonb,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "patientId" uuid,
    "doctorId" uuid
);


ALTER TABLE public.patient_provider OWNER TO postgres;

--
-- Name: patient_provider_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.patient_provider_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.patient_provider_id_seq OWNER TO postgres;

--
-- Name: patient_provider_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.patient_provider_id_seq OWNED BY public.patient_provider.id;


--
-- Name: share; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.share (
    id integer NOT NULL,
    "imageId" integer NOT NULL,
    "expiresAt" timestamp without time zone NOT NULL,
    "recipientEmail" text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    token text NOT NULL
);


ALTER TABLE public.share OWNER TO postgres;

--
-- Name: share_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.share_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.share_id_seq OWNER TO postgres;

--
-- Name: share_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.share_id_seq OWNED BY public.share.id;


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_settings (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "maxUploadSize" integer DEFAULT 50 NOT NULL,
    "maxShareDuration" integer DEFAULT 30 NOT NULL,
    "requireEmailVerification" boolean DEFAULT true NOT NULL,
    "enforcePasswordComplexity" boolean DEFAULT true NOT NULL,
    "enableAuditLog" boolean DEFAULT true NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "allowedFileTypes" text DEFAULT '.jpg,.jpeg,.png,.pdf,.dicom'::text NOT NULL
);


ALTER TABLE public.system_settings OWNER TO postgres;

--
-- Name: system_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.system_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.system_settings_id_seq OWNER TO postgres;

--
-- Name: system_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.system_settings_id_seq OWNED BY public.system_settings.id;


--
-- Name: user; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."user" (
    role public.user_role_enum DEFAULT 'Patient'::public.user_role_enum NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "twoFactorSecret" text,
    "twoFactorEnabled" boolean DEFAULT false NOT NULL,
    "backupCodes" text[],
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    username text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL
);


ALTER TABLE public."user" OWNER TO postgres;

--
-- Name: user_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_settings (
    id integer NOT NULL,
    "emailNotifications" boolean DEFAULT true NOT NULL,
    "pushNotifications" boolean DEFAULT true NOT NULL,
    "messageNotifications" boolean DEFAULT true NOT NULL,
    "shareNotifications" boolean DEFAULT true NOT NULL,
    theme text DEFAULT 'light'::text NOT NULL,
    language text DEFAULT 'en'::text NOT NULL,
    timezone text DEFAULT 'UTC'::text NOT NULL,
    "highContrast" boolean DEFAULT false NOT NULL,
    "fontSize" text DEFAULT 'medium'::text NOT NULL,
    "reduceMotion" boolean DEFAULT false NOT NULL,
    "profileVisibility" text DEFAULT 'public'::text NOT NULL,
    "showOnlineStatus" boolean DEFAULT true NOT NULL,
    "workingHours" jsonb,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "userId" uuid
);


ALTER TABLE public.user_settings OWNER TO postgres;

--
-- Name: user_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_settings_id_seq OWNER TO postgres;

--
-- Name: user_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_settings_id_seq OWNED BY public.user_settings.id;


--
-- Name: annotation id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.annotation ALTER COLUMN id SET DEFAULT nextval('public.annotation_id_seq'::regclass);


--
-- Name: appointment id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointment ALTER COLUMN id SET DEFAULT nextval('public.appointment_id_seq'::regclass);


--
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- Name: health_metric id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.health_metric ALTER COLUMN id SET DEFAULT nextval('public.health_metric_id_seq'::regclass);


--
-- Name: image id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.image ALTER COLUMN id SET DEFAULT nextval('public.image_id_seq'::regclass);


--
-- Name: medical_record id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medical_record ALTER COLUMN id SET DEFAULT nextval('public.medical_record_id_seq'::regclass);


--
-- Name: message id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message ALTER COLUMN id SET DEFAULT nextval('public.message_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: patient_provider id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_provider ALTER COLUMN id SET DEFAULT nextval('public.patient_provider_id_seq'::regclass);


--
-- Name: share id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.share ALTER COLUMN id SET DEFAULT nextval('public.share_id_seq'::regclass);


--
-- Name: system_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings ALTER COLUMN id SET DEFAULT nextval('public.system_settings_id_seq'::regclass);


--
-- Name: user_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_settings ALTER COLUMN id SET DEFAULT nextval('public.user_settings_id_seq'::regclass);


--
-- Data for Name: annotation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.annotation (id, "imageId", x, y, "createdAt", "updatedAt", text) FROM stdin;
\.


--
-- Data for Name: appointment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.appointment (id, "doctorId", "startTime", "endTime", status, notes, "imageId", "createdAt", "updatedAt", "patientId") FROM stdin;
\.


--
-- Data for Name: audit_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_log (id, details, "timestamp", action, "userId") FROM stdin;
\.


--
-- Data for Name: chat_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chat_messages (id, "sessionId", type, content, status, metadata, "createdAt", session_id) FROM stdin;
\.


--
-- Data for Name: chat_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chat_sessions (id, "isActive", metadata, "startedAt", "endedAt", user_id, "userId") FROM stdin;
\.


--
-- Data for Name: health_metric; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.health_metric (id, "doctorId", "metricType", value, unit, metadata, "timestamp", "patientId") FROM stdin;
\.


--
-- Data for Name: image; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.image (id, metadata, size, "uploadedAt", "updatedAt", filename, "s3Key", "s3Url", "userId") FROM stdin;
\.


--
-- Data for Name: medical_record; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.medical_record (id, "doctorId", "recordType", description, data, tags, metadata, "createdAt", "updatedAt", "patientId") FROM stdin;
\.


--
-- Data for Name: message; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.message (id, "createdAt", "updatedAt", "isEdited", "readAt", content, "senderId", "recipientId") FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.migrations (id, "timestamp", name) FROM stdin;
1	1709051234567	UpdateUserIdToUUID1709051234567
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, type, content, read, "createdAt", user_id, "userId") FROM stdin;
\.


--
-- Data for Name: patient_provider; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.patient_provider (id, "isActive", metadata, "createdAt", "updatedAt", "patientId", "doctorId") FROM stdin;
\.


--
-- Data for Name: share; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.share (id, "imageId", "expiresAt", "recipientEmail", "createdAt", token) FROM stdin;
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_settings (id, "userId", "maxUploadSize", "maxShareDuration", "requireEmailVerification", "enforcePasswordComplexity", "enableAuditLog", "updatedAt", "allowedFileTypes") FROM stdin;
\.


--
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."user" (role, "isActive", "twoFactorSecret", "twoFactorEnabled", "backupCodes", "createdAt", "updatedAt", username, email, password, id) FROM stdin;
\.


--
-- Data for Name: user_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_settings (id, "emailNotifications", "pushNotifications", "messageNotifications", "shareNotifications", theme, language, timezone, "highContrast", "fontSize", "reduceMotion", "profileVisibility", "showOnlineStatus", "workingHours", "updatedAt", "userId") FROM stdin;
\.


--
-- Name: annotation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.annotation_id_seq', 1, false);


--
-- Name: appointment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.appointment_id_seq', 1, false);


--
-- Name: audit_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_log_id_seq', 1, false);


--
-- Name: health_metric_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.health_metric_id_seq', 1, false);


--
-- Name: image_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.image_id_seq', 1, false);


--
-- Name: medical_record_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.medical_record_id_seq', 1, false);


--
-- Name: message_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.message_id_seq', 1, false);


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.migrations_id_seq', 1, true);


--
-- Name: patient_provider_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.patient_provider_id_seq', 1, false);


--
-- Name: share_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.share_id_seq', 1, false);


--
-- Name: system_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.system_settings_id_seq', 1, false);


--
-- Name: user_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_settings_id_seq', 1, false);


--
-- Name: user_settings PK_00f004f5922a0744d174530d639; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT "PK_00f004f5922a0744d174530d639" PRIMARY KEY (id);


--
-- Name: audit_log PK_07fefa57f7f5ab8fc3f52b3ed0b; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT "PK_07fefa57f7f5ab8fc3f52b3ed0b" PRIMARY KEY (id);


--
-- Name: chat_messages PK_40c55ee0e571e268b0d3cd37d10; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT "PK_40c55ee0e571e268b0d3cd37d10" PRIMARY KEY (id);


--
-- Name: share PK_67a2b28d2cff31834bc2aa1ed7c; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.share
    ADD CONSTRAINT "PK_67a2b28d2cff31834bc2aa1ed7c" PRIMARY KEY (id);


--
-- Name: notifications PK_6a72c3c0f683f6462415e653c3a; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY (id);


--
-- Name: system_settings PK_82521f08790d248b2a80cc85d40; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT "PK_82521f08790d248b2a80cc85d40" PRIMARY KEY (id);


--
-- Name: migrations PK_8c82d7f526340ab734260ea46be; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY (id);


--
-- Name: health_metric PK_ac453c80ed52411e41da34fd0e0; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.health_metric
    ADD CONSTRAINT "PK_ac453c80ed52411e41da34fd0e0" PRIMARY KEY (id);


--
-- Name: patient_provider PK_ad455afd13076d7c1bc54101695; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_provider
    ADD CONSTRAINT "PK_ad455afd13076d7c1bc54101695" PRIMARY KEY (id);


--
-- Name: message PK_ba01f0a3e0123651915008bc578; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message
    ADD CONSTRAINT "PK_ba01f0a3e0123651915008bc578" PRIMARY KEY (id);


--
-- Name: image PK_d6db1ab4ee9ad9dbe86c64e4cc3; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.image
    ADD CONSTRAINT "PK_d6db1ab4ee9ad9dbe86c64e4cc3" PRIMARY KEY (id);


--
-- Name: medical_record PK_d96ede886356ac47ddcbb0bf3a4; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medical_record
    ADD CONSTRAINT "PK_d96ede886356ac47ddcbb0bf3a4" PRIMARY KEY (id);


--
-- Name: appointment PK_e8be1a53027415e709ce8a2db74; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointment
    ADD CONSTRAINT "PK_e8be1a53027415e709ce8a2db74" PRIMARY KEY (id);


--
-- Name: annotation PK_ec39ebae82efb7cfc77302eb7b3; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.annotation
    ADD CONSTRAINT "PK_ec39ebae82efb7cfc77302eb7b3" PRIMARY KEY (id);


--
-- Name: chat_sessions PK_efc151a4aafa9a28b73dedc485f; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT "PK_efc151a4aafa9a28b73dedc485f" PRIMARY KEY (id);


--
-- Name: user PK_user_id; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT "PK_user_id" PRIMARY KEY (id);


--
-- Name: share UQ_446f6788678810ca5c4516fe974; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.share
    ADD CONSTRAINT "UQ_446f6788678810ca5c4516fe974" UNIQUE (token);


--
-- Name: user UQ_78a916df40e02a9deb1c4b75edb; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE (username);


--
-- Name: image UQ_9d208143ab33fcbe24bc4ac70a0; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.image
    ADD CONSTRAINT "UQ_9d208143ab33fcbe24bc4ac70a0" UNIQUE ("s3Key");


--
-- Name: user UQ_e12875dfb3b1d92d7d7c5377e22; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE (email);


--
-- Name: chat_messages FK_0672782561e44d43febcfba2984; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT "FK_0672782561e44d43febcfba2984" FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id);


--
-- Name: share FK_38a24039ea5b9f2cdfd00a85948; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.share
    ADD CONSTRAINT "FK_38a24039ea5b9f2cdfd00a85948" FOREIGN KEY ("imageId") REFERENCES public.image(id);


--
-- Name: appointment FK_a6fb8e35856918c90e2700c32d0; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointment
    ADD CONSTRAINT "FK_a6fb8e35856918c90e2700c32d0" FOREIGN KEY ("imageId") REFERENCES public.image(id);


--
-- Name: appointment FK_appointment_patient; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointment
    ADD CONSTRAINT "FK_appointment_patient" FOREIGN KEY ("patientId") REFERENCES public."user"(id);


--
-- Name: audit_log FK_audit_log_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT "FK_audit_log_user" FOREIGN KEY ("userId") REFERENCES public."user"(id);


--
-- Name: annotation FK_b98109edfcd196cef505eada65c; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.annotation
    ADD CONSTRAINT "FK_b98109edfcd196cef505eada65c" FOREIGN KEY ("imageId") REFERENCES public.image(id);


--
-- Name: chat_sessions FK_chat_sessions_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT "FK_chat_sessions_user" FOREIGN KEY ("userId") REFERENCES public."user"(id);


--
-- Name: health_metric FK_health_metric_patient; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.health_metric
    ADD CONSTRAINT "FK_health_metric_patient" FOREIGN KEY ("patientId") REFERENCES public."user"(id);


--
-- Name: image FK_image_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.image
    ADD CONSTRAINT "FK_image_user" FOREIGN KEY ("userId") REFERENCES public."user"(id);


--
-- Name: medical_record FK_medical_record_patient; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medical_record
    ADD CONSTRAINT "FK_medical_record_patient" FOREIGN KEY ("patientId") REFERENCES public."user"(id);


--
-- Name: message FK_message_recipient; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message
    ADD CONSTRAINT "FK_message_recipient" FOREIGN KEY ("recipientId") REFERENCES public."user"(id);


--
-- Name: message FK_message_sender; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message
    ADD CONSTRAINT "FK_message_sender" FOREIGN KEY ("senderId") REFERENCES public."user"(id);


--
-- Name: notifications FK_notifications_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "FK_notifications_user" FOREIGN KEY ("userId") REFERENCES public."user"(id);


--
-- Name: patient_provider FK_patient_provider_doctor; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_provider
    ADD CONSTRAINT "FK_patient_provider_doctor" FOREIGN KEY ("doctorId") REFERENCES public."user"(id);


--
-- Name: patient_provider FK_patient_provider_patient; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_provider
    ADD CONSTRAINT "FK_patient_provider_patient" FOREIGN KEY ("patientId") REFERENCES public."user"(id);


--
-- Name: user_settings FK_user_settings_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT "FK_user_settings_user" FOREIGN KEY ("userId") REFERENCES public."user"(id);


--
-- PostgreSQL database dump complete
--

