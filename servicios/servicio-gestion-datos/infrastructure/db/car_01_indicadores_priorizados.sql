-- =====================================================================
-- CAR_NNA_CORTES: variables para indicadores priorizados PP0117 (4397/4398)
-- Fuente: RENE CAR NNA BÁSICO / ESPECIALIZADO (INABIF), hojas EDNE.
-- Idempotente: el servicio servicio-gestion-datos también las crea al arrancar
-- (infrastructure/db/car_schema_upgrade.py). Ejecutar como GESTION_DATOS_DB.
-- =====================================================================
DECLARE
  PROCEDURE add_col(p_col VARCHAR2, p_tipo VARCHAR2) IS
    v_n NUMBER;
  BEGIN
    SELECT COUNT(*) INTO v_n FROM user_tab_columns
     WHERE table_name = 'CAR_NNA_CORTES' AND column_name = UPPER(p_col);
    IF v_n = 0 THEN
      EXECUTE IMMEDIATE 'ALTER TABLE car_nna_cortes ADD (' || p_col || ' ' || p_tipo || ')';
    END IF;
  END;
BEGIN
  add_col('res_eva_tem',     'VARCHAR2(50)');   -- RES_EVA_TEM  (col. DI) taller psicológico
  add_col('nna_prom',        'VARCHAR2(20)');   -- NNA_PROM     promovido nivel educativo
  add_col('nna_est',         'VARCHAR2(20)');   -- NNA_EST      matriculado / estudiante
  add_col('tip_act_soc_1',   'VARCHAR2(100)');  -- TIP_ACT_SOC_1 (col. DA)
  add_col('tip_act_soc_2',   'VARCHAR2(100)');  -- TIP_ACT_SOC_2 (col. DB)
  add_col('fec_apr_est',     'DATE');           -- FEC_APR_EST  aprobación de estrategia
  add_col('pti_consensuado', 'VARCHAR2(20)');   -- PTI_CONSENSUADO2
  add_col('plan_vida_ind',   'VARCHAR2(20)');   -- PLAN_VIDA_IND
  add_col('fec_vid_ind',     'DATE');           -- FEC_VID_IND  aprobación PVI
  add_col('por_cum_met',     'NUMBER(10)');     -- POR_CUM_MET  (col. CG) % metas PVI
  add_col('rango_6_meses',   'VARCHAR2(50)');   -- "rango 6" / "Rango2" (col. EK)
END;
/
