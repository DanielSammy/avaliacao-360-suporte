-- MySQL dump 10.13  Distrib 5.6.22, for Win64 (x86_64)
--
-- Host: localhost    Database: avaliacaospace
-- ------------------------------------------------------
-- Server version	5.6.22-log

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `avaliacao_criterios`
--

DROP TABLE IF EXISTS `avaliacao_criterios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `avaliacao_criterios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `avaliacao_id` int(11) NOT NULL,
  `criterio_id` int(11) NOT NULL,
  `valor_alcancado` decimal(10,2) NOT NULL,
  `meta_atingida` tinyint(1) NOT NULL,
  `avaliado_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_avaliacao` (`avaliacao_id`),
  KEY `fk_criterio` (`criterio_id`),
  KEY `fk_operador` (`avaliado_id`) USING BTREE,
  CONSTRAINT `fk_avaliacao` FOREIGN KEY (`avaliacao_id`) REFERENCES `avaliacoes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_criterio` FOREIGN KEY (`criterio_id`) REFERENCES `criterios` (`id`),
  CONSTRAINT `fk_operador` FOREIGN KEY (`avaliado_id`) REFERENCES `operadores` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER trg_ai_criterios_atualiza_resumo
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
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER trg_au_criterios_atualiza_resumo
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
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER trg_ad_criterios_atualiza_resumo
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
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `avaliacoes`
--

DROP TABLE IF EXISTS `avaliacoes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `avaliacoes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `operador_id` int(11) NOT NULL,
  `avaliador_id` int(11) NOT NULL,
  `periodo` varchar(7) NOT NULL,
  `valor_total_meta` decimal(10,2) NOT NULL,
  `data_criacao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `data_ultima_edicao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_avaliacoes_operador` (`operador_id`),
  KEY `fk_avaliacoes_avaliador` (`avaliador_id`),
  CONSTRAINT `fk_avaliacoes_avaliador` FOREIGN KEY (`avaliador_id`) REFERENCES `operadores` (`id`),
  CONSTRAINT `fk_avaliacoes_operador` FOREIGN KEY (`operador_id`) REFERENCES `operadores` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER trg_ai_avaliacoes_atualiza_resumo
AFTER INSERT ON avaliacoes
FOR EACH ROW
BEGIN
    CALL atualiza_resultado_operador_periodo (NEW.operador_id, NEW.periodo);
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER trg_au_avaliacoes_atualiza_resumo
AFTER UPDATE ON avaliacoes
FOR EACH ROW
BEGIN
    -- Atualiza o par novo
    CALL atualiza_resultado_operador_periodo (NEW.operador_id, NEW.periodo);

    -- Se mudou operador e/ou período, atualiza também o par antigo
    IF (NEW.operador_id <> OLD.operador_id) OR (NEW.periodo <> OLD.periodo) THEN
        CALL atualiza_resultado_operador_periodo (OLD.operador_id, OLD.periodo);
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER trg_ad_avaliacoes_atualiza_resumo
AFTER DELETE ON avaliacoes
FOR EACH ROW
BEGIN
    CALL atualiza_resultado_operador_periodo (OLD.operador_id, OLD.periodo);
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `criterios`
--

DROP TABLE IF EXISTS `criterios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `criterios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) NOT NULL,
  `tipo` enum('qualitativo','quantitativo') NOT NULL,
  `tipo_meta` enum('maior_melhor','menor_melhor') NOT NULL,
  `peso` int(11) NOT NULL,
  `ordem` int(11) DEFAULT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `id_criterio` varchar(200) NOT NULL,
  `valor_meta` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `operadores`
--

DROP TABLE IF EXISTS `operadores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `operadores` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) NOT NULL,
  `login` varchar(255) NOT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `grupo` int(11) DEFAULT NULL,
  `data_inclusao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `participa_avaliacao` tinyint(1) NOT NULL DEFAULT '1',
  `nivel` enum('Nivel 1','Nivel 2','Nivel 3','Sup Avançado') NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `login` (`login`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `resultado_operador`
--

DROP TABLE IF EXISTS `resultado_operador`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `resultado_operador` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_operador` int(11) NOT NULL,
  `periodo` varchar(7) NOT NULL,
  `total_meta` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total_apurado` decimal(10,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_operador_periodo` (`id_operador`,`periodo`),
  CONSTRAINT `fk_rop_operador` FOREIGN KEY (`id_operador`) REFERENCES `operadores` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=59 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping routines for database 'avaliacaospace'
--
/*!50003 DROP PROCEDURE IF EXISTS `atualiza_resultado_operador_periodo` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'STRICT_TRANS_TABLES,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `atualiza_resultado_operador_periodo`(
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-09-01 18:24:20
