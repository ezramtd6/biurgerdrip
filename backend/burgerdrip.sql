--
-- PostgreSQL database dump
--

-- Dumped from database version 17.0
-- Dumped by pg_dump version 17.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.token_blacklist_outstandingtoken DROP CONSTRAINT IF EXISTS token_blacklist_outs_user_id_83bc629a_fk_accounts_;
ALTER TABLE IF EXISTS ONLY public.token_blacklist_blacklistedtoken DROP CONSTRAINT IF EXISTS token_blacklist_blacklistedtoken_token_id_3cc7fe56_fk;
ALTER TABLE IF EXISTS ONLY public.products_product DROP CONSTRAINT IF EXISTS products_product_category_id_9b594869_fk_products_category_id;
ALTER TABLE IF EXISTS ONLY public.products_optionvalue DROP CONSTRAINT IF EXISTS products_optionvalue_option_group_id_ac3cf26c_fk_products_;
ALTER TABLE IF EXISTS ONLY public.products_optiongroup DROP CONSTRAINT IF EXISTS products_optiongroup_product_id_a9165078_fk_products_product_id;
ALTER TABLE IF EXISTS ONLY public.orders_orderitemoption DROP CONSTRAINT IF EXISTS orders_orderitemopti_order_item_id_a1d4ccec_fk_orders_or;
ALTER TABLE IF EXISTS ONLY public.orders_orderitemoption DROP CONSTRAINT IF EXISTS orders_orderitemopti_option_value_id_1fd73d94_fk_products_;
ALTER TABLE IF EXISTS ONLY public.orders_orderitem DROP CONSTRAINT IF EXISTS orders_orderitem_product_id_afe4254a_fk_products_product_id;
ALTER TABLE IF EXISTS ONLY public.orders_orderitem DROP CONSTRAINT IF EXISTS orders_orderitem_order_id_fe61a34d_fk_orders_order_id;
ALTER TABLE IF EXISTS ONLY public.orders_order DROP CONSTRAINT IF EXISTS orders_order_customer_id_0b76f6a4_fk_accounts_user_id;
ALTER TABLE IF EXISTS ONLY public.orders_order DROP CONSTRAINT IF EXISTS orders_order_cashier_id_bb86c6ee_fk_accounts_user_id;
ALTER TABLE IF EXISTS ONLY public.django_admin_log DROP CONSTRAINT IF EXISTS django_admin_log_user_id_c564eba6_fk_accounts_user_id;
ALTER TABLE IF EXISTS ONLY public.django_admin_log DROP CONSTRAINT IF EXISTS django_admin_log_content_type_id_c4bce8eb_fk_django_co;
ALTER TABLE IF EXISTS ONLY public.auth_permission DROP CONSTRAINT IF EXISTS auth_permission_content_type_id_2f476e4b_fk_django_co;
ALTER TABLE IF EXISTS ONLY public.auth_group_permissions DROP CONSTRAINT IF EXISTS auth_group_permissions_group_id_b120cbf9_fk_auth_group_id;
ALTER TABLE IF EXISTS ONLY public.auth_group_permissions DROP CONSTRAINT IF EXISTS auth_group_permissio_permission_id_84c5c92e_fk_auth_perm;
ALTER TABLE IF EXISTS ONLY public.accounts_user_user_permissions DROP CONSTRAINT IF EXISTS accounts_user_user_p_user_id_e4f0a161_fk_accounts_;
ALTER TABLE IF EXISTS ONLY public.accounts_user_user_permissions DROP CONSTRAINT IF EXISTS accounts_user_user_p_permission_id_113bb443_fk_auth_perm;
ALTER TABLE IF EXISTS ONLY public.accounts_user_groups DROP CONSTRAINT IF EXISTS accounts_user_groups_user_id_52b62117_fk_accounts_user_id;
ALTER TABLE IF EXISTS ONLY public.accounts_user_groups DROP CONSTRAINT IF EXISTS accounts_user_groups_group_id_bd11a704_fk_auth_group_id;
ALTER TABLE IF EXISTS ONLY public.accounts_passwordresettoken DROP CONSTRAINT IF EXISTS accounts_passwordres_user_id_2789bc5c_fk_accounts_;
DROP INDEX IF EXISTS public.token_blacklist_outstandingtoken_user_id_83bc629a;
DROP INDEX IF EXISTS public.token_blacklist_outstandingtoken_jti_hex_d9bdf6f7_like;
DROP INDEX IF EXISTS public.products_product_category_id_9b594869;
DROP INDEX IF EXISTS public.products_optionvalue_option_group_id_ac3cf26c;
DROP INDEX IF EXISTS public.products_optiongroup_product_id_a9165078;
DROP INDEX IF EXISTS public.orders_orderitemoption_order_item_id_a1d4ccec;
DROP INDEX IF EXISTS public.orders_orderitemoption_option_value_id_1fd73d94;
DROP INDEX IF EXISTS public.orders_orderitem_product_id_afe4254a;
DROP INDEX IF EXISTS public.orders_orderitem_order_id_fe61a34d;
DROP INDEX IF EXISTS public.orders_order_order_number_4e985f70_like;
DROP INDEX IF EXISTS public.orders_order_customer_id_0b76f6a4;
DROP INDEX IF EXISTS public.orders_order_cashier_id_bb86c6ee;
DROP INDEX IF EXISTS public.django_session_session_key_c0390e0f_like;
DROP INDEX IF EXISTS public.django_session_expire_date_a5c62663;
DROP INDEX IF EXISTS public.django_admin_log_user_id_c564eba6;
DROP INDEX IF EXISTS public.django_admin_log_content_type_id_c4bce8eb;
DROP INDEX IF EXISTS public.auth_permission_content_type_id_2f476e4b;
DROP INDEX IF EXISTS public.auth_group_permissions_permission_id_84c5c92e;
DROP INDEX IF EXISTS public.auth_group_permissions_group_id_b120cbf9;
DROP INDEX IF EXISTS public.auth_group_name_a6ea08ec_like;
DROP INDEX IF EXISTS public.accounts_user_user_permissions_user_id_e4f0a161;
DROP INDEX IF EXISTS public.accounts_user_user_permissions_permission_id_113bb443;
DROP INDEX IF EXISTS public.accounts_user_groups_user_id_52b62117;
DROP INDEX IF EXISTS public.accounts_user_groups_group_id_bd11a704;
DROP INDEX IF EXISTS public.accounts_user_email_b2644a56_like;
DROP INDEX IF EXISTS public.accounts_passwordresettoken_user_id_2789bc5c;
DROP INDEX IF EXISTS public.accounts_passwordresettoken_token_f38bb86f_like;
ALTER TABLE IF EXISTS ONLY public.token_blacklist_outstandingtoken DROP CONSTRAINT IF EXISTS token_blacklist_outstandingtoken_pkey;
ALTER TABLE IF EXISTS ONLY public.token_blacklist_outstandingtoken DROP CONSTRAINT IF EXISTS token_blacklist_outstandingtoken_jti_hex_d9bdf6f7_uniq;
ALTER TABLE IF EXISTS ONLY public.token_blacklist_blacklistedtoken DROP CONSTRAINT IF EXISTS token_blacklist_blacklistedtoken_token_id_key;
ALTER TABLE IF EXISTS ONLY public.token_blacklist_blacklistedtoken DROP CONSTRAINT IF EXISTS token_blacklist_blacklistedtoken_pkey;
ALTER TABLE IF EXISTS ONLY public.products_restaurantinfo DROP CONSTRAINT IF EXISTS products_restaurantinfo_pkey;
ALTER TABLE IF EXISTS ONLY public.products_product DROP CONSTRAINT IF EXISTS products_product_pkey;
ALTER TABLE IF EXISTS ONLY public.products_optionvalue DROP CONSTRAINT IF EXISTS products_optionvalue_pkey;
ALTER TABLE IF EXISTS ONLY public.products_optiongroup DROP CONSTRAINT IF EXISTS products_optiongroup_pkey;
ALTER TABLE IF EXISTS ONLY public.products_category DROP CONSTRAINT IF EXISTS products_category_pkey;
ALTER TABLE IF EXISTS ONLY public.orders_orderitemoption DROP CONSTRAINT IF EXISTS orders_orderitemoption_pkey;
ALTER TABLE IF EXISTS ONLY public.orders_orderitem DROP CONSTRAINT IF EXISTS orders_orderitem_pkey;
ALTER TABLE IF EXISTS ONLY public.orders_order DROP CONSTRAINT IF EXISTS orders_order_pkey;
ALTER TABLE IF EXISTS ONLY public.orders_order DROP CONSTRAINT IF EXISTS orders_order_order_number_key;
ALTER TABLE IF EXISTS ONLY public.django_session DROP CONSTRAINT IF EXISTS django_session_pkey;
ALTER TABLE IF EXISTS ONLY public.django_migrations DROP CONSTRAINT IF EXISTS django_migrations_pkey;
ALTER TABLE IF EXISTS ONLY public.django_content_type DROP CONSTRAINT IF EXISTS django_content_type_pkey;
ALTER TABLE IF EXISTS ONLY public.django_content_type DROP CONSTRAINT IF EXISTS django_content_type_app_label_model_76bd3d3b_uniq;
ALTER TABLE IF EXISTS ONLY public.django_admin_log DROP CONSTRAINT IF EXISTS django_admin_log_pkey;
ALTER TABLE IF EXISTS ONLY public.auth_permission DROP CONSTRAINT IF EXISTS auth_permission_pkey;
ALTER TABLE IF EXISTS ONLY public.auth_permission DROP CONSTRAINT IF EXISTS auth_permission_content_type_id_codename_01ab375a_uniq;
ALTER TABLE IF EXISTS ONLY public.auth_group DROP CONSTRAINT IF EXISTS auth_group_pkey;
ALTER TABLE IF EXISTS ONLY public.auth_group_permissions DROP CONSTRAINT IF EXISTS auth_group_permissions_pkey;
ALTER TABLE IF EXISTS ONLY public.auth_group_permissions DROP CONSTRAINT IF EXISTS auth_group_permissions_group_id_permission_id_0cd325b0_uniq;
ALTER TABLE IF EXISTS ONLY public.auth_group DROP CONSTRAINT IF EXISTS auth_group_name_key;
ALTER TABLE IF EXISTS ONLY public.accounts_user_user_permissions DROP CONSTRAINT IF EXISTS accounts_user_user_permissions_pkey;
ALTER TABLE IF EXISTS ONLY public.accounts_user_user_permissions DROP CONSTRAINT IF EXISTS accounts_user_user_permi_user_id_permission_id_2ab516c2_uniq;
ALTER TABLE IF EXISTS ONLY public.accounts_user DROP CONSTRAINT IF EXISTS accounts_user_pkey;
ALTER TABLE IF EXISTS ONLY public.accounts_user_groups DROP CONSTRAINT IF EXISTS accounts_user_groups_user_id_group_id_59c0b32f_uniq;
ALTER TABLE IF EXISTS ONLY public.accounts_user_groups DROP CONSTRAINT IF EXISTS accounts_user_groups_pkey;
ALTER TABLE IF EXISTS ONLY public.accounts_user DROP CONSTRAINT IF EXISTS accounts_user_email_key;
ALTER TABLE IF EXISTS ONLY public.accounts_passwordresettoken DROP CONSTRAINT IF EXISTS accounts_passwordresettoken_token_key;
ALTER TABLE IF EXISTS ONLY public.accounts_passwordresettoken DROP CONSTRAINT IF EXISTS accounts_passwordresettoken_pkey;
DROP TABLE IF EXISTS public.token_blacklist_outstandingtoken;
DROP TABLE IF EXISTS public.token_blacklist_blacklistedtoken;
DROP TABLE IF EXISTS public.products_restaurantinfo;
DROP TABLE IF EXISTS public.products_product;
DROP TABLE IF EXISTS public.products_optionvalue;
DROP TABLE IF EXISTS public.products_optiongroup;
DROP TABLE IF EXISTS public.products_category;
DROP TABLE IF EXISTS public.orders_orderitemoption;
DROP TABLE IF EXISTS public.orders_orderitem;
DROP TABLE IF EXISTS public.orders_order;
DROP TABLE IF EXISTS public.django_session;
DROP TABLE IF EXISTS public.django_migrations;
DROP TABLE IF EXISTS public.django_content_type;
DROP TABLE IF EXISTS public.django_admin_log;
DROP TABLE IF EXISTS public.auth_permission;
DROP TABLE IF EXISTS public.auth_group_permissions;
DROP TABLE IF EXISTS public.auth_group;
DROP TABLE IF EXISTS public.accounts_user_user_permissions;
DROP TABLE IF EXISTS public.accounts_user_groups;
DROP TABLE IF EXISTS public.accounts_user;
DROP TABLE IF EXISTS public.accounts_passwordresettoken;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts_passwordresettoken; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accounts_passwordresettoken (
    id bigint NOT NULL,
    token character varying(255) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    is_used boolean NOT NULL,
    user_id bigint NOT NULL
);


ALTER TABLE public.accounts_passwordresettoken OWNER TO postgres;

--
-- Name: accounts_passwordresettoken_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.accounts_passwordresettoken ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.accounts_passwordresettoken_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: accounts_user; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accounts_user (
    id bigint NOT NULL,
    password character varying(128) NOT NULL,
    last_login timestamp with time zone,
    is_superuser boolean NOT NULL,
    first_name character varying(150) NOT NULL,
    last_name character varying(150) NOT NULL,
    is_staff boolean NOT NULL,
    is_active boolean NOT NULL,
    date_joined timestamp with time zone NOT NULL,
    email character varying(254) NOT NULL,
    phone character varying(20) NOT NULL,
    role character varying(20) NOT NULL
);


ALTER TABLE public.accounts_user OWNER TO postgres;

--
-- Name: accounts_user_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accounts_user_groups (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    group_id integer NOT NULL
);


ALTER TABLE public.accounts_user_groups OWNER TO postgres;

--
-- Name: accounts_user_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.accounts_user_groups ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.accounts_user_groups_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: accounts_user_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.accounts_user ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.accounts_user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: accounts_user_user_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accounts_user_user_permissions (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    permission_id integer NOT NULL
);


ALTER TABLE public.accounts_user_user_permissions OWNER TO postgres;

--
-- Name: accounts_user_user_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.accounts_user_user_permissions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.accounts_user_user_permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: auth_group; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auth_group (
    id integer NOT NULL,
    name character varying(150) NOT NULL
);


ALTER TABLE public.auth_group OWNER TO postgres;

--
-- Name: auth_group_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.auth_group ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_group_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: auth_group_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auth_group_permissions (
    id bigint NOT NULL,
    group_id integer NOT NULL,
    permission_id integer NOT NULL
);


ALTER TABLE public.auth_group_permissions OWNER TO postgres;

--
-- Name: auth_group_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.auth_group_permissions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_group_permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: auth_permission; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auth_permission (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    content_type_id integer NOT NULL,
    codename character varying(100) NOT NULL
);


ALTER TABLE public.auth_permission OWNER TO postgres;

--
-- Name: auth_permission_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.auth_permission ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_permission_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_admin_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.django_admin_log (
    id integer NOT NULL,
    action_time timestamp with time zone NOT NULL,
    object_id text,
    object_repr character varying(200) NOT NULL,
    action_flag smallint NOT NULL,
    change_message text NOT NULL,
    content_type_id integer,
    user_id bigint NOT NULL,
    CONSTRAINT django_admin_log_action_flag_check CHECK ((action_flag >= 0))
);


ALTER TABLE public.django_admin_log OWNER TO postgres;

--
-- Name: django_admin_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.django_admin_log ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.django_admin_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_content_type; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.django_content_type (
    id integer NOT NULL,
    app_label character varying(100) NOT NULL,
    model character varying(100) NOT NULL
);


ALTER TABLE public.django_content_type OWNER TO postgres;

--
-- Name: django_content_type_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.django_content_type ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.django_content_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.django_migrations (
    id bigint NOT NULL,
    app character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    applied timestamp with time zone NOT NULL
);


ALTER TABLE public.django_migrations OWNER TO postgres;

--
-- Name: django_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.django_migrations ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.django_migrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_session; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.django_session (
    session_key character varying(40) NOT NULL,
    session_data text NOT NULL,
    expire_date timestamp with time zone NOT NULL
);


ALTER TABLE public.django_session OWNER TO postgres;

--
-- Name: orders_order; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders_order (
    id bigint NOT NULL,
    order_number character varying(20) NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    discount numeric(10,2) NOT NULL,
    tax numeric(10,2) NOT NULL,
    total numeric(10,2) NOT NULL,
    payment_method character varying(20),
    status character varying(20) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    cashier_id bigint,
    customer_id bigint
);


ALTER TABLE public.orders_order OWNER TO postgres;

--
-- Name: orders_order_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.orders_order ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.orders_order_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: orders_orderitem; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders_orderitem (
    id bigint NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    order_id bigint NOT NULL,
    product_id bigint NOT NULL,
    CONSTRAINT orders_orderitem_quantity_check CHECK ((quantity >= 0))
);


ALTER TABLE public.orders_orderitem OWNER TO postgres;

--
-- Name: orders_orderitem_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.orders_orderitem ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.orders_orderitem_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: orders_orderitemoption; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders_orderitemoption (
    id bigint NOT NULL,
    price_adjustment numeric(10,2) NOT NULL,
    option_value_id bigint NOT NULL,
    order_item_id bigint NOT NULL
);


ALTER TABLE public.orders_orderitemoption OWNER TO postgres;

--
-- Name: orders_orderitemoption_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.orders_orderitemoption ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.orders_orderitemoption_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: products_category; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products_category (
    id bigint NOT NULL,
    name character varying(100) NOT NULL,
    image character varying(100),
    description text NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.products_category OWNER TO postgres;

--
-- Name: products_category_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.products_category ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.products_category_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: products_optiongroup; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products_optiongroup (
    id bigint NOT NULL,
    name character varying(100) NOT NULL,
    required boolean NOT NULL,
    multiple_choice boolean NOT NULL,
    display_order integer NOT NULL,
    product_id bigint NOT NULL,
    CONSTRAINT products_optiongroup_display_order_check CHECK ((display_order >= 0))
);


ALTER TABLE public.products_optiongroup OWNER TO postgres;

--
-- Name: products_optiongroup_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.products_optiongroup ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.products_optiongroup_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: products_optionvalue; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products_optionvalue (
    id bigint NOT NULL,
    name character varying(100) NOT NULL,
    price_adjustment numeric(8,2) NOT NULL,
    available boolean NOT NULL,
    display_order integer NOT NULL,
    option_group_id bigint NOT NULL,
    CONSTRAINT products_optionvalue_display_order_check CHECK ((display_order >= 0))
);


ALTER TABLE public.products_optionvalue OWNER TO postgres;

--
-- Name: products_optionvalue_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.products_optionvalue ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.products_optionvalue_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: products_product; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products_product (
    id bigint NOT NULL,
    name character varying(100) NOT NULL,
    description text NOT NULL,
    image character varying(100),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    category_id bigint NOT NULL
);


ALTER TABLE public.products_product OWNER TO postgres;

--
-- Name: products_product_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.products_product ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.products_product_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: products_restaurantinfo; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products_restaurantinfo (
    id bigint NOT NULL,
    name character varying(100) NOT NULL,
    logo character varying(100),
    address character varying(255) NOT NULL,
    phone character varying(20) NOT NULL,
    opening_hours character varying(100) NOT NULL
);


ALTER TABLE public.products_restaurantinfo OWNER TO postgres;

--
-- Name: products_restaurantinfo_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.products_restaurantinfo ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.products_restaurantinfo_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: token_blacklist_blacklistedtoken; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.token_blacklist_blacklistedtoken (
    id bigint NOT NULL,
    blacklisted_at timestamp with time zone NOT NULL,
    token_id bigint NOT NULL
);


ALTER TABLE public.token_blacklist_blacklistedtoken OWNER TO postgres;

--
-- Name: token_blacklist_blacklistedtoken_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.token_blacklist_blacklistedtoken ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.token_blacklist_blacklistedtoken_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: token_blacklist_outstandingtoken; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.token_blacklist_outstandingtoken (
    id bigint NOT NULL,
    token text NOT NULL,
    created_at timestamp with time zone,
    expires_at timestamp with time zone NOT NULL,
    user_id bigint,
    jti character varying(255) NOT NULL
);


ALTER TABLE public.token_blacklist_outstandingtoken OWNER TO postgres;

--
-- Name: token_blacklist_outstandingtoken_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.token_blacklist_outstandingtoken ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.token_blacklist_outstandingtoken_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Data for Name: accounts_passwordresettoken; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.accounts_passwordresettoken (id, token, created_at, is_used, user_id) FROM stdin;
2	jxShHcfanYTY7Zk3egyldnPdDI2eV-_kBNyyqB-YRVbX53x2V0reB7YLBZqhnLdgVPOw-8RFyhVMcy-vGYDQ_g	2026-07-26 21:06:43.11899+03	f	7
9	eJlYZPPvcShXYFWGzYKo8SYwVC9dvd98ozHItpsCN_MCGcQQIzVNxxY7BAtuarvJK_hzFh2VC0fgF_GeK2pFXg	2026-07-26 21:46:18.934013+03	f	14
\.


--
-- Data for Name: accounts_user; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.accounts_user (id, password, last_login, is_superuser, first_name, last_name, is_staff, is_active, date_joined, email, phone, role) FROM stdin;
1	pbkdf2_sha256$1200000$LWsXxhi2ZCK8BBzcJFO7EV$CqK1ae4PmqqculaR2YaBJTN8y6FJ/j/k7BNo6F9F8Pw=	\N	f	Ezra	Mekuria	f	t	2026-07-26 07:33:58.513197+03	ezramtd36@gmail.com	0945762877	CUSTOMER
4	pbkdf2_sha256$1200000$O1Bg2ILhftqoCp0CaxJXN5$R+7uUF1/HJllDBYcrhBCJC7FPF75yFUWjt6CcNcnMeU=	\N	f	Amiel	Tadele	f	t	2026-07-26 08:11:49.423644+03	nopoy@gmail.com	0945762877	MANAGER
2	pbkdf2_sha256$1200000$bs85xorIEiXtdBBOzsdBJU$zNZSPqT0cE5mwSUI5s6Ia/o+ZHP/Vv0iLXhf42qjtPc=	2026-07-26 19:04:21.101102+03	t	Admin	Admin	t	t	2026-07-26 07:42:51.603159+03	burgerdrip@gmail.com		ADMIN
7	!1pq6mB9nfGf7JI6l9cEhBgPtew2bcYzicEF0dQSf	\N	f	Amiel	Tadele	f	f	2026-07-26 21:06:43.040019+03	ezramekuriatessema@gmail.com	0945762877	MANAGER
14	!XrkJXmY40M6U6Yo1OvRnaVduAiCoAjHcKpXEUdGD	\N	f	Amiel	Tadele	f	f	2026-07-26 21:46:18.883792+03	bmebme658@gmail.com	0945762877	MANAGER
\.


--
-- Data for Name: accounts_user_groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.accounts_user_groups (id, user_id, group_id) FROM stdin;
\.


--
-- Data for Name: accounts_user_user_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.accounts_user_user_permissions (id, user_id, permission_id) FROM stdin;
\.


--
-- Data for Name: auth_group; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.auth_group (id, name) FROM stdin;
\.


--
-- Data for Name: auth_group_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.auth_group_permissions (id, group_id, permission_id) FROM stdin;
\.


--
-- Data for Name: auth_permission; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.auth_permission (id, name, content_type_id, codename) FROM stdin;
1	Can add log entry	1	add_logentry
2	Can change log entry	1	change_logentry
3	Can delete log entry	1	delete_logentry
4	Can view log entry	1	view_logentry
5	Can add permission	3	add_permission
6	Can change permission	3	change_permission
7	Can delete permission	3	delete_permission
8	Can view permission	3	view_permission
9	Can add group	2	add_group
10	Can change group	2	change_group
11	Can delete group	2	delete_group
12	Can view group	2	view_group
13	Can add content type	4	add_contenttype
14	Can change content type	4	change_contenttype
15	Can delete content type	4	delete_contenttype
16	Can view content type	4	view_contenttype
17	Can add session	5	add_session
18	Can change session	5	change_session
19	Can delete session	5	delete_session
20	Can view session	5	view_session
21	Can add Blacklisted Token	6	add_blacklistedtoken
22	Can change Blacklisted Token	6	change_blacklistedtoken
23	Can delete Blacklisted Token	6	delete_blacklistedtoken
24	Can view Blacklisted Token	6	view_blacklistedtoken
25	Can add Outstanding Token	7	add_outstandingtoken
26	Can change Outstanding Token	7	change_outstandingtoken
27	Can delete Outstanding Token	7	delete_outstandingtoken
28	Can view Outstanding Token	7	view_outstandingtoken
29	Can add user	8	add_user
30	Can change user	8	change_user
31	Can delete user	8	delete_user
32	Can view user	8	view_user
33	Can add category	9	add_category
34	Can change category	9	change_category
35	Can delete category	9	delete_category
36	Can view category	9	view_category
37	Can add option group	10	add_optiongroup
38	Can change option group	10	change_optiongroup
39	Can delete option group	10	delete_optiongroup
40	Can view option group	10	view_optiongroup
41	Can add restaurant info	13	add_restaurantinfo
42	Can change restaurant info	13	change_restaurantinfo
43	Can delete restaurant info	13	delete_restaurantinfo
44	Can view restaurant info	13	view_restaurantinfo
45	Can add option value	11	add_optionvalue
46	Can change option value	11	change_optionvalue
47	Can delete option value	11	delete_optionvalue
48	Can view option value	11	view_optionvalue
49	Can add product	12	add_product
50	Can change product	12	change_product
51	Can delete product	12	delete_product
52	Can view product	12	view_product
53	Can add order	14	add_order
54	Can change order	14	change_order
55	Can delete order	14	delete_order
56	Can view order	14	view_order
57	Can add order item	15	add_orderitem
58	Can change order item	15	change_orderitem
59	Can delete order item	15	delete_orderitem
60	Can view order item	15	view_orderitem
61	Can add order item option	16	add_orderitemoption
62	Can change order item option	16	change_orderitemoption
63	Can delete order item option	16	delete_orderitemoption
64	Can view order item option	16	view_orderitemoption
65	Can add password reset token	17	add_passwordresettoken
66	Can change password reset token	17	change_passwordresettoken
67	Can delete password reset token	17	delete_passwordresettoken
68	Can view password reset token	17	view_passwordresettoken
\.


--
-- Data for Name: django_admin_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.django_admin_log (id, action_time, object_id, object_repr, action_flag, change_message, content_type_id, user_id) FROM stdin;
1	2026-07-26 07:48:13.021486+03	3	amare@gmail.com	1	[{"added": {}}]	8	2
2	2026-07-26 07:53:09.43912+03	3	amare@gmail.com	3		8	2
3	2026-07-26 08:11:51.08225+03	4	nopoy@gmail.com	1	[{"added": {}}]	8	2
4	2026-07-26 08:12:19.806328+03	5	bmebme658@gmail.com	1	[{"added": {}}]	8	2
5	2026-07-26 20:43:52.06505+03	6	ezramekuriatessema@gmail.com	1	[{"added": {}}]	8	2
6	2026-07-26 20:45:11.305738+03	6	ezramekuriatessema@gmail.com	3		8	2
7	2026-07-26 21:06:43.12099+03	7	ezramekuriatessema@gmail.com	1	[{"added": {}}]	8	2
8	2026-07-26 21:19:57.276783+03	5	bmebme658@gmail.com	3		8	2
9	2026-07-26 21:41:25.194137+03	13	bmebme658@gmail.com	1	[{"added": {}}]	8	2
10	2026-07-26 21:46:07.336327+03	13	bmebme658@gmail.com	3		8	2
11	2026-07-26 21:46:22.612125+03	14	bmebme658@gmail.com	1	[{"added": {}}]	8	2
\.


--
-- Data for Name: django_content_type; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.django_content_type (id, app_label, model) FROM stdin;
1	admin	logentry
2	auth	group
3	auth	permission
4	contenttypes	contenttype
5	sessions	session
6	token_blacklist	blacklistedtoken
7	token_blacklist	outstandingtoken
8	accounts	user
9	products	category
10	products	optiongroup
11	products	optionvalue
12	products	product
13	products	restaurantinfo
14	orders	order
15	orders	orderitem
16	orders	orderitemoption
17	accounts	passwordresettoken
\.


--
-- Data for Name: django_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.django_migrations (id, app, name, applied) FROM stdin;
1	contenttypes	0001_initial	2026-07-26 07:29:58.066934+03
2	contenttypes	0002_remove_content_type_name	2026-07-26 07:29:58.082926+03
3	auth	0001_initial	2026-07-26 07:29:58.149885+03
4	auth	0002_alter_permission_name_max_length	2026-07-26 07:29:58.158881+03
5	auth	0003_alter_user_email_max_length	2026-07-26 07:29:58.168876+03
6	auth	0004_alter_user_username_opts	2026-07-26 07:29:58.178872+03
7	auth	0005_alter_user_last_login_null	2026-07-26 07:29:58.189864+03
8	auth	0006_require_contenttypes_0002	2026-07-26 07:29:58.191862+03
9	auth	0007_alter_validators_add_error_messages	2026-07-26 07:29:58.201856+03
10	auth	0008_alter_user_username_max_length	2026-07-26 07:29:58.211851+03
11	auth	0009_alter_user_last_name_max_length	2026-07-26 07:29:58.220846+03
12	auth	0010_alter_group_name_max_length	2026-07-26 07:29:58.239835+03
13	auth	0011_update_proxy_permissions	2026-07-26 07:29:58.248829+03
14	auth	0012_alter_user_first_name_max_length	2026-07-26 07:29:58.257828+03
15	accounts	0001_initial	2026-07-26 07:29:58.330781+03
16	admin	0001_initial	2026-07-26 07:29:58.373757+03
17	admin	0002_logentry_remove_auto_add	2026-07-26 07:29:58.386749+03
18	admin	0003_logentry_add_action_flag_choices	2026-07-26 07:29:58.399745+03
19	products	0001_initial	2026-07-26 07:29:58.479695+03
20	sessions	0001_initial	2026-07-26 07:29:58.497685+03
21	token_blacklist	0001_initial	2026-07-26 07:29:58.563648+03
22	token_blacklist	0002_outstandingtoken_jti_hex	2026-07-26 07:29:58.579637+03
23	token_blacklist	0003_auto_20171017_2007	2026-07-26 07:29:58.617617+03
24	token_blacklist	0004_auto_20171017_2013	2026-07-26 07:29:58.640603+03
25	token_blacklist	0005_remove_outstandingtoken_jti	2026-07-26 07:29:58.656595+03
26	token_blacklist	0006_auto_20171017_2113	2026-07-26 07:29:58.673584+03
27	token_blacklist	0007_auto_20171017_2214	2026-07-26 07:29:58.729552+03
28	token_blacklist	0008_migrate_to_bigautofield	2026-07-26 07:29:58.812504+03
29	token_blacklist	0010_fix_migrate_to_bigautofield	2026-07-26 07:29:58.852482+03
30	token_blacklist	0011_linearizes_history	2026-07-26 07:29:58.855479+03
31	token_blacklist	0012_alter_outstandingtoken_user	2026-07-26 07:29:58.874469+03
32	token_blacklist	0013_alter_blacklistedtoken_options_and_more	2026-07-26 07:29:58.897454+03
33	accounts	0002_alter_user_managers	2026-07-26 07:56:43.049977+03
34	orders	0001_initial	2026-07-26 07:56:43.312826+03
35	accounts	0003_alter_user_role	2026-07-26 08:13:59.765162+03
36	accounts	0004_passwordresettoken	2026-07-26 20:38:25.660042+03
\.


--
-- Data for Name: django_session; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.django_session (session_key, session_data, expire_date) FROM stdin;
au4h3d6rq4lonvj1clj4ce3ql7wdqm0q	.eJxVjEEOgjAQRe_StWnKQJni0j1naKbTqUVNSSisjHcXEha6fe_9_1aetjX7rcrip6iuCtTllwXip5RDxAeV-6x5LusyBX0k-rRVj3OU1-1s_w4y1byvG2ddRGRjkQXYmN7soGlTsl1nBkkRjaWWkSABhIQUHYrthWUAIFCfL9CnN9U:1wo1Kv:rHaFk5aDq3q8FZ36bC635NAYe7NYJgy20G83-_MdvqU	2026-08-09 19:04:21.108041+03
\.


--
-- Data for Name: orders_order; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders_order (id, order_number, subtotal, discount, tax, total, payment_method, status, created_at, updated_at, cashier_id, customer_id) FROM stdin;
\.


--
-- Data for Name: orders_orderitem; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders_orderitem (id, quantity, unit_price, total_price, order_id, product_id) FROM stdin;
\.


--
-- Data for Name: orders_orderitemoption; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders_orderitemoption (id, price_adjustment, option_value_id, order_item_id) FROM stdin;
\.


--
-- Data for Name: products_category; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products_category (id, name, image, description, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: products_optiongroup; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products_optiongroup (id, name, required, multiple_choice, display_order, product_id) FROM stdin;
\.


--
-- Data for Name: products_optionvalue; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products_optionvalue (id, name, price_adjustment, available, display_order, option_group_id) FROM stdin;
\.


--
-- Data for Name: products_product; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products_product (id, name, description, image, created_at, updated_at, category_id) FROM stdin;
\.


--
-- Data for Name: products_restaurantinfo; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products_restaurantinfo (id, name, logo, address, phone, opening_hours) FROM stdin;
\.


--
-- Data for Name: token_blacklist_blacklistedtoken; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.token_blacklist_blacklistedtoken (id, blacklisted_at, token_id) FROM stdin;
\.


--
-- Data for Name: token_blacklist_outstandingtoken; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.token_blacklist_outstandingtoken (id, token, created_at, expires_at, user_id, jti) FROM stdin;
1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NTY0NTI5NCwiaWF0IjoxNzg1MDQwNDk0LCJqdGkiOiJhYTIzODVmODc0YjQ0NGZiYmQ3ZmRiYzdiODUyMTE3ZiIsInVzZXJfaWQiOiIxIn0.vJCTADq_QlRlXyvf1F0-K1p-VT2W0mqAlTWqGtAIgoA	2026-07-26 07:34:54.862028+03	2026-08-02 07:34:54+03	1	aa2385f874b444fbbd7fdbc7b852117f
2	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NTY0NTQzNiwiaWF0IjoxNzg1MDQwNjM2LCJqdGkiOiJkNGY3ZmU1NTQxYjc0NmRlOTAzODY4ZmZkYmY5YmJiOSIsInVzZXJfaWQiOiIxIn0.W1u9MgpEr5ZmKMDOD5dtw-_b_rRPui433GBm0btZk_A	2026-07-26 07:37:16.641414+03	2026-08-02 07:37:16+03	1	d4f7fe5541b746de903868ffdbf9bbb9
3	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NTY0NTQ2MywiaWF0IjoxNzg1MDQwNjYzLCJqdGkiOiI0ZWM1MWZiZmNkNmU0OGU5ODYwZWU3MzY0ZjhiNWE4ZSIsInVzZXJfaWQiOiIxIn0.2u0gdXYvtEytEqmXGBU-s_rMA2ISVKL6cXJLPF4XSxA	2026-07-26 07:37:43.904717+03	2026-08-02 07:37:43+03	1	4ec51fbfcd6e48e9860ee7364f8b5a8e
4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NTcwMTgxOCwiaWF0IjoxNzg1MDk3MDE4LCJqdGkiOiIwZGIxYWRlOWFmZTY0ZmU3YmViNGQ3ZWFmNGE3YTMzZCIsInVzZXJfaWQiOiIxIn0.kovu_jhU764TxjvhOQORfd-_TyX0M3YUH4-XtvKkqtc	2026-07-26 23:16:58.735391+03	2026-08-02 23:16:58+03	1	0db1ade9afe64fe7beb4d7eaf4a7a33d
\.


--
-- Name: accounts_passwordresettoken_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.accounts_passwordresettoken_id_seq', 9, true);


--
-- Name: accounts_user_groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.accounts_user_groups_id_seq', 1, false);


--
-- Name: accounts_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.accounts_user_id_seq', 14, true);


--
-- Name: accounts_user_user_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.accounts_user_user_permissions_id_seq', 1, false);


--
-- Name: auth_group_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.auth_group_id_seq', 1, false);


--
-- Name: auth_group_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.auth_group_permissions_id_seq', 1, false);


--
-- Name: auth_permission_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.auth_permission_id_seq', 68, true);


--
-- Name: django_admin_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.django_admin_log_id_seq', 11, true);


--
-- Name: django_content_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.django_content_type_id_seq', 17, true);


--
-- Name: django_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.django_migrations_id_seq', 36, true);


--
-- Name: orders_order_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.orders_order_id_seq', 1, false);


--
-- Name: orders_orderitem_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.orders_orderitem_id_seq', 1, false);


--
-- Name: orders_orderitemoption_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.orders_orderitemoption_id_seq', 1, false);


--
-- Name: products_category_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_category_id_seq', 1, false);


--
-- Name: products_optiongroup_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_optiongroup_id_seq', 1, false);


--
-- Name: products_optionvalue_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_optionvalue_id_seq', 1, false);


--
-- Name: products_product_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_product_id_seq', 1, false);


--
-- Name: products_restaurantinfo_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_restaurantinfo_id_seq', 1, false);


--
-- Name: token_blacklist_blacklistedtoken_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.token_blacklist_blacklistedtoken_id_seq', 1, false);


--
-- Name: token_blacklist_outstandingtoken_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.token_blacklist_outstandingtoken_id_seq', 4, true);


--
-- Name: accounts_passwordresettoken accounts_passwordresettoken_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts_passwordresettoken
    ADD CONSTRAINT accounts_passwordresettoken_pkey PRIMARY KEY (id);


--
-- Name: accounts_passwordresettoken accounts_passwordresettoken_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts_passwordresettoken
    ADD CONSTRAINT accounts_passwordresettoken_token_key UNIQUE (token);


--
-- Name: accounts_user accounts_user_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts_user
    ADD CONSTRAINT accounts_user_email_key UNIQUE (email);


--
-- Name: accounts_user_groups accounts_user_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts_user_groups
    ADD CONSTRAINT accounts_user_groups_pkey PRIMARY KEY (id);


--
-- Name: accounts_user_groups accounts_user_groups_user_id_group_id_59c0b32f_uniq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts_user_groups
    ADD CONSTRAINT accounts_user_groups_user_id_group_id_59c0b32f_uniq UNIQUE (user_id, group_id);


--
-- Name: accounts_user accounts_user_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts_user
    ADD CONSTRAINT accounts_user_pkey PRIMARY KEY (id);


--
-- Name: accounts_user_user_permissions accounts_user_user_permi_user_id_permission_id_2ab516c2_uniq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts_user_user_permissions
    ADD CONSTRAINT accounts_user_user_permi_user_id_permission_id_2ab516c2_uniq UNIQUE (user_id, permission_id);


--
-- Name: accounts_user_user_permissions accounts_user_user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts_user_user_permissions
    ADD CONSTRAINT accounts_user_user_permissions_pkey PRIMARY KEY (id);


--
-- Name: auth_group auth_group_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_group
    ADD CONSTRAINT auth_group_name_key UNIQUE (name);


--
-- Name: auth_group_permissions auth_group_permissions_group_id_permission_id_0cd325b0_uniq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissions_group_id_permission_id_0cd325b0_uniq UNIQUE (group_id, permission_id);


--
-- Name: auth_group_permissions auth_group_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissions_pkey PRIMARY KEY (id);


--
-- Name: auth_group auth_group_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_group
    ADD CONSTRAINT auth_group_pkey PRIMARY KEY (id);


--
-- Name: auth_permission auth_permission_content_type_id_codename_01ab375a_uniq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_permission
    ADD CONSTRAINT auth_permission_content_type_id_codename_01ab375a_uniq UNIQUE (content_type_id, codename);


--
-- Name: auth_permission auth_permission_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_permission
    ADD CONSTRAINT auth_permission_pkey PRIMARY KEY (id);


--
-- Name: django_admin_log django_admin_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.django_admin_log
    ADD CONSTRAINT django_admin_log_pkey PRIMARY KEY (id);


--
-- Name: django_content_type django_content_type_app_label_model_76bd3d3b_uniq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.django_content_type
    ADD CONSTRAINT django_content_type_app_label_model_76bd3d3b_uniq UNIQUE (app_label, model);


--
-- Name: django_content_type django_content_type_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.django_content_type
    ADD CONSTRAINT django_content_type_pkey PRIMARY KEY (id);


--
-- Name: django_migrations django_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.django_migrations
    ADD CONSTRAINT django_migrations_pkey PRIMARY KEY (id);


--
-- Name: django_session django_session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.django_session
    ADD CONSTRAINT django_session_pkey PRIMARY KEY (session_key);


--
-- Name: orders_order orders_order_order_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders_order
    ADD CONSTRAINT orders_order_order_number_key UNIQUE (order_number);


--
-- Name: orders_order orders_order_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders_order
    ADD CONSTRAINT orders_order_pkey PRIMARY KEY (id);


--
-- Name: orders_orderitem orders_orderitem_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders_orderitem
    ADD CONSTRAINT orders_orderitem_pkey PRIMARY KEY (id);


--
-- Name: orders_orderitemoption orders_orderitemoption_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders_orderitemoption
    ADD CONSTRAINT orders_orderitemoption_pkey PRIMARY KEY (id);


--
-- Name: products_category products_category_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products_category
    ADD CONSTRAINT products_category_pkey PRIMARY KEY (id);


--
-- Name: products_optiongroup products_optiongroup_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products_optiongroup
    ADD CONSTRAINT products_optiongroup_pkey PRIMARY KEY (id);


--
-- Name: products_optionvalue products_optionvalue_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products_optionvalue
    ADD CONSTRAINT products_optionvalue_pkey PRIMARY KEY (id);


--
-- Name: products_product products_product_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products_product
    ADD CONSTRAINT products_product_pkey PRIMARY KEY (id);


--
-- Name: products_restaurantinfo products_restaurantinfo_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products_restaurantinfo
    ADD CONSTRAINT products_restaurantinfo_pkey PRIMARY KEY (id);


--
-- Name: token_blacklist_blacklistedtoken token_blacklist_blacklistedtoken_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_blacklist_blacklistedtoken
    ADD CONSTRAINT token_blacklist_blacklistedtoken_pkey PRIMARY KEY (id);


--
-- Name: token_blacklist_blacklistedtoken token_blacklist_blacklistedtoken_token_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_blacklist_blacklistedtoken
    ADD CONSTRAINT token_blacklist_blacklistedtoken_token_id_key UNIQUE (token_id);


--
-- Name: token_blacklist_outstandingtoken token_blacklist_outstandingtoken_jti_hex_d9bdf6f7_uniq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_blacklist_outstandingtoken
    ADD CONSTRAINT token_blacklist_outstandingtoken_jti_hex_d9bdf6f7_uniq UNIQUE (jti);


--
-- Name: token_blacklist_outstandingtoken token_blacklist_outstandingtoken_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_blacklist_outstandingtoken
    ADD CONSTRAINT token_blacklist_outstandingtoken_pkey PRIMARY KEY (id);


--
-- Name: accounts_passwordresettoken_token_f38bb86f_like; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX accounts_passwordresettoken_token_f38bb86f_like ON public.accounts_passwordresettoken USING btree (token varchar_pattern_ops);


--
-- Name: accounts_passwordresettoken_user_id_2789bc5c; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX accounts_passwordresettoken_user_id_2789bc5c ON public.accounts_passwordresettoken USING btree (user_id);


--
-- Name: accounts_user_email_b2644a56_like; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX accounts_user_email_b2644a56_like ON public.accounts_user USING btree (email varchar_pattern_ops);


--
-- Name: accounts_user_groups_group_id_bd11a704; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX accounts_user_groups_group_id_bd11a704 ON public.accounts_user_groups USING btree (group_id);


--
-- Name: accounts_user_groups_user_id_52b62117; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX accounts_user_groups_user_id_52b62117 ON public.accounts_user_groups USING btree (user_id);


--
-- Name: accounts_user_user_permissions_permission_id_113bb443; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX accounts_user_user_permissions_permission_id_113bb443 ON public.accounts_user_user_permissions USING btree (permission_id);


--
-- Name: accounts_user_user_permissions_user_id_e4f0a161; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX accounts_user_user_permissions_user_id_e4f0a161 ON public.accounts_user_user_permissions USING btree (user_id);


--
-- Name: auth_group_name_a6ea08ec_like; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX auth_group_name_a6ea08ec_like ON public.auth_group USING btree (name varchar_pattern_ops);


--
-- Name: auth_group_permissions_group_id_b120cbf9; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX auth_group_permissions_group_id_b120cbf9 ON public.auth_group_permissions USING btree (group_id);


--
-- Name: auth_group_permissions_permission_id_84c5c92e; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX auth_group_permissions_permission_id_84c5c92e ON public.auth_group_permissions USING btree (permission_id);


--
-- Name: auth_permission_content_type_id_2f476e4b; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX auth_permission_content_type_id_2f476e4b ON public.auth_permission USING btree (content_type_id);


--
-- Name: django_admin_log_content_type_id_c4bce8eb; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX django_admin_log_content_type_id_c4bce8eb ON public.django_admin_log USING btree (content_type_id);


--
-- Name: django_admin_log_user_id_c564eba6; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX django_admin_log_user_id_c564eba6 ON public.django_admin_log USING btree (user_id);


--
-- Name: django_session_expire_date_a5c62663; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX django_session_expire_date_a5c62663 ON public.django_session USING btree (expire_date);


--
-- Name: django_session_session_key_c0390e0f_like; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX django_session_session_key_c0390e0f_like ON public.django_session USING btree (session_key varchar_pattern_ops);


--
-- Name: orders_order_cashier_id_bb86c6ee; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX orders_order_cashier_id_bb86c6ee ON public.orders_order USING btree (cashier_id);


--
-- Name: orders_order_customer_id_0b76f6a4; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX orders_order_customer_id_0b76f6a4 ON public.orders_order USING btree (customer_id);


--
-- Name: orders_order_order_number_4e985f70_like; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX orders_order_order_number_4e985f70_like ON public.orders_order USING btree (order_number varchar_pattern_ops);


--
-- Name: orders_orderitem_order_id_fe61a34d; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX orders_orderitem_order_id_fe61a34d ON public.orders_orderitem USING btree (order_id);


--
-- Name: orders_orderitem_product_id_afe4254a; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX orders_orderitem_product_id_afe4254a ON public.orders_orderitem USING btree (product_id);


--
-- Name: orders_orderitemoption_option_value_id_1fd73d94; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX orders_orderitemoption_option_value_id_1fd73d94 ON public.orders_orderitemoption USING btree (option_value_id);


--
-- Name: orders_orderitemoption_order_item_id_a1d4ccec; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX orders_orderitemoption_order_item_id_a1d4ccec ON public.orders_orderitemoption USING btree (order_item_id);


--
-- Name: products_optiongroup_product_id_a9165078; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX products_optiongroup_product_id_a9165078 ON public.products_optiongroup USING btree (product_id);


--
-- Name: products_optionvalue_option_group_id_ac3cf26c; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX products_optionvalue_option_group_id_ac3cf26c ON public.products_optionvalue USING btree (option_group_id);


--
-- Name: products_product_category_id_9b594869; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX products_product_category_id_9b594869 ON public.products_product USING btree (category_id);


--
-- Name: token_blacklist_outstandingtoken_jti_hex_d9bdf6f7_like; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX token_blacklist_outstandingtoken_jti_hex_d9bdf6f7_like ON public.token_blacklist_outstandingtoken USING btree (jti varchar_pattern_ops);


--
-- Name: token_blacklist_outstandingtoken_user_id_83bc629a; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX token_blacklist_outstandingtoken_user_id_83bc629a ON public.token_blacklist_outstandingtoken USING btree (user_id);


--
-- Name: accounts_passwordresettoken accounts_passwordres_user_id_2789bc5c_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts_passwordresettoken
    ADD CONSTRAINT accounts_passwordres_user_id_2789bc5c_fk_accounts_ FOREIGN KEY (user_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: accounts_user_groups accounts_user_groups_group_id_bd11a704_fk_auth_group_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts_user_groups
    ADD CONSTRAINT accounts_user_groups_group_id_bd11a704_fk_auth_group_id FOREIGN KEY (group_id) REFERENCES public.auth_group(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: accounts_user_groups accounts_user_groups_user_id_52b62117_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts_user_groups
    ADD CONSTRAINT accounts_user_groups_user_id_52b62117_fk_accounts_user_id FOREIGN KEY (user_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: accounts_user_user_permissions accounts_user_user_p_permission_id_113bb443_fk_auth_perm; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts_user_user_permissions
    ADD CONSTRAINT accounts_user_user_p_permission_id_113bb443_fk_auth_perm FOREIGN KEY (permission_id) REFERENCES public.auth_permission(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: accounts_user_user_permissions accounts_user_user_p_user_id_e4f0a161_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts_user_user_permissions
    ADD CONSTRAINT accounts_user_user_p_user_id_e4f0a161_fk_accounts_ FOREIGN KEY (user_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_group_permissions auth_group_permissio_permission_id_84c5c92e_fk_auth_perm; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissio_permission_id_84c5c92e_fk_auth_perm FOREIGN KEY (permission_id) REFERENCES public.auth_permission(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_group_permissions auth_group_permissions_group_id_b120cbf9_fk_auth_group_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissions_group_id_b120cbf9_fk_auth_group_id FOREIGN KEY (group_id) REFERENCES public.auth_group(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_permission auth_permission_content_type_id_2f476e4b_fk_django_co; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_permission
    ADD CONSTRAINT auth_permission_content_type_id_2f476e4b_fk_django_co FOREIGN KEY (content_type_id) REFERENCES public.django_content_type(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: django_admin_log django_admin_log_content_type_id_c4bce8eb_fk_django_co; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.django_admin_log
    ADD CONSTRAINT django_admin_log_content_type_id_c4bce8eb_fk_django_co FOREIGN KEY (content_type_id) REFERENCES public.django_content_type(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: django_admin_log django_admin_log_user_id_c564eba6_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.django_admin_log
    ADD CONSTRAINT django_admin_log_user_id_c564eba6_fk_accounts_user_id FOREIGN KEY (user_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: orders_order orders_order_cashier_id_bb86c6ee_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders_order
    ADD CONSTRAINT orders_order_cashier_id_bb86c6ee_fk_accounts_user_id FOREIGN KEY (cashier_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: orders_order orders_order_customer_id_0b76f6a4_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders_order
    ADD CONSTRAINT orders_order_customer_id_0b76f6a4_fk_accounts_user_id FOREIGN KEY (customer_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: orders_orderitem orders_orderitem_order_id_fe61a34d_fk_orders_order_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders_orderitem
    ADD CONSTRAINT orders_orderitem_order_id_fe61a34d_fk_orders_order_id FOREIGN KEY (order_id) REFERENCES public.orders_order(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: orders_orderitem orders_orderitem_product_id_afe4254a_fk_products_product_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders_orderitem
    ADD CONSTRAINT orders_orderitem_product_id_afe4254a_fk_products_product_id FOREIGN KEY (product_id) REFERENCES public.products_product(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: orders_orderitemoption orders_orderitemopti_option_value_id_1fd73d94_fk_products_; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders_orderitemoption
    ADD CONSTRAINT orders_orderitemopti_option_value_id_1fd73d94_fk_products_ FOREIGN KEY (option_value_id) REFERENCES public.products_optionvalue(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: orders_orderitemoption orders_orderitemopti_order_item_id_a1d4ccec_fk_orders_or; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders_orderitemoption
    ADD CONSTRAINT orders_orderitemopti_order_item_id_a1d4ccec_fk_orders_or FOREIGN KEY (order_item_id) REFERENCES public.orders_orderitem(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: products_optiongroup products_optiongroup_product_id_a9165078_fk_products_product_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products_optiongroup
    ADD CONSTRAINT products_optiongroup_product_id_a9165078_fk_products_product_id FOREIGN KEY (product_id) REFERENCES public.products_product(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: products_optionvalue products_optionvalue_option_group_id_ac3cf26c_fk_products_; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products_optionvalue
    ADD CONSTRAINT products_optionvalue_option_group_id_ac3cf26c_fk_products_ FOREIGN KEY (option_group_id) REFERENCES public.products_optiongroup(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: products_product products_product_category_id_9b594869_fk_products_category_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products_product
    ADD CONSTRAINT products_product_category_id_9b594869_fk_products_category_id FOREIGN KEY (category_id) REFERENCES public.products_category(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: token_blacklist_blacklistedtoken token_blacklist_blacklistedtoken_token_id_3cc7fe56_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_blacklist_blacklistedtoken
    ADD CONSTRAINT token_blacklist_blacklistedtoken_token_id_3cc7fe56_fk FOREIGN KEY (token_id) REFERENCES public.token_blacklist_outstandingtoken(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: token_blacklist_outstandingtoken token_blacklist_outs_user_id_83bc629a_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.token_blacklist_outstandingtoken
    ADD CONSTRAINT token_blacklist_outs_user_id_83bc629a_fk_accounts_ FOREIGN KEY (user_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- PostgreSQL database dump complete
--

