DROP PROCEDURE IF EXISTS atualiza_resultado_operador_periodo;
DELIMITER $$
CREATE PROCEDURE atualiza_resultado_operador_periodo(
    IN p_id_operador INT,
    IN p_periodo     VARCHAR(7)
)
BEGIN
    DECLARE v_total_meta    DECIMAL(10,2);
    DECLARE v_total_apurado DECIMAL(18,4); -- precisão maior para somar médias

    -- 1) total_meta: soma do valor_total_meta das avaliações do operador no período
    SELECT COALESCE(a.valor_total_meta, 0)
      INTO v_total_meta
      FROM avaliacoes a
     WHERE a.operador_id = p_id_operador
       AND a.periodo     = p_periodo limit 1;

    -- 2) total_apurado: SOMA das MÉDIAS por critério
    --    para todas as avaliações do operador no período
    SELECT COALESCE(SUM(t.avg_por_criterio), 0)
      INTO v_total_apurado
      FROM (
            SELECT AVG(ac.valor_alcancado) AS avg_por_criterio
              FROM avaliacao_criterios ac
              JOIN avaliacoes a
                ON a.id = ac.avaliacao_id
             WHERE a.operador_id = p_id_operador
               AND a.periodo     = p_periodo
             GROUP BY ac.criterio_id
           ) AS t;

    -- UPSERT no resumo (armazena com 2 casas)
    INSERT INTO resultado_operador (id_operador, periodo, total_meta, total_apurado)
    VALUES (p_id_operador, p_periodo, v_total_meta, ROUND(v_total_apurado, 2))
    ON DUPLICATE KEY UPDATE
        total_meta    = VALUES(total_meta),
        total_apurado = VALUES(total_apurado);
END$$
DELIMITER ;

-- 3) TRIGGERS em avaliacao_criterios
DELIMITER $$

-- AFTER INSERT em avaliacao_criterios
CREATE TRIGGER trg_ai_criterios_atualiza_resumo
AFTER INSERT ON avaliacao_criterios
FOR EACH ROW
BEGIN
    DECLARE v_op  INT;
    DECLARE v_per VARCHAR(7);

    SELECT a.operador_id, a.periodo
      INTO v_op, v_per
      FROM avaliacoes a
     WHERE a.id = NEW.avaliacao_id;

    CALL atualiza_resultado_operador_periodo (v_op, v_per);
END$$

-- AFTER UPDATE em avaliacao_criterios
CREATE TRIGGER trg_au_criterios_atualiza_resumo
AFTER UPDATE ON avaliacao_criterios
FOR EACH ROW
BEGIN
    DECLARE v_op_new  INT; DECLARE v_per_new VARCHAR(7);
    DECLARE v_op_old  INT; DECLARE v_per_old VARCHAR(7);

    -- par novo
    SELECT a.operador_id, a.periodo INTO v_op_new, v_per_new
      FROM avaliacoes a WHERE a.id = NEW.avaliacao_id;

    CALL atualiza_resultado_operador_periodo (v_op_new, v_per_new);

    -- se mudou a avaliação (portanto o par operador/período pode ter mudado), atualiza o par antigo também
    IF NEW.avaliacao_id <> OLD.avaliacao_id THEN
        SELECT a.operador_id, a.periodo INTO v_op_old, v_per_old
          FROM avaliacoes a WHERE a.id = OLD.avaliacao_id;

        CALL atualiza_resultado_operador_periodo (v_op_old, v_per_old);
    END IF;
END$$

-- AFTER DELETE em avaliacao_criterios
CREATE TRIGGER trg_ad_criterios_atualiza_resumo
AFTER DELETE ON avaliacao_criterios
FOR EACH ROW
BEGIN
    DECLARE v_op  INT;
    DECLARE v_per VARCHAR(7);

    SELECT a.operador_id, a.periodo
      INTO v_op, v_per
      FROM avaliacoes a
     WHERE a.id = OLD.avaliacao_id;

    CALL atualiza_resultado_operador_periodo (v_op, v_per);
END$$

DELIMITER ;

-- 4) TRIGGERS em avaliacoes (para refletir mudanças de período/operador/valor_total_meta)
DELIMITER $$

-- AFTER INSERT em avaliacoes
CREATE TRIGGER trg_ai_avaliacoes_atualiza_resumo
AFTER INSERT ON avaliacoes
FOR EACH ROW
BEGIN
    CALL atualiza_resultado_operador_periodo (NEW.operador_id, NEW.periodo);
END$$

-- AFTER UPDATE em avaliacoes
CREATE TRIGGER trg_au_avaliacoes_atualiza_resumo
AFTER UPDATE ON avaliacoes
FOR EACH ROW
BEGIN
    -- Atualiza o par novo
    CALL atualiza_resultado_operador_periodo (NEW.operador_id, NEW.periodo);

    -- Se mudou operador e/ou período, atualiza também o par antigo
    IF (NEW.operador_id <> OLD.operador_id) OR (NEW.periodo <> OLD.periodo) THEN
        CALL atualiza_resultado_operador_periodo (OLD.operador_id, OLD.periodo);
    END IF;
END$$

-- AFTER DELETE em avaliacoes
CREATE TRIGGER trg_ad_avaliacoes_atualiza_resumo
AFTER DELETE ON avaliacoes
FOR EACH ROW
BEGIN
    CALL atualiza_resultado_operador_periodo (OLD.operador_id, OLD.periodo);
END$$

DELIMITER ;