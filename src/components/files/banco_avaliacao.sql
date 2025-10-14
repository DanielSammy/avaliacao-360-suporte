CREATE DATABASE  IF NOT EXISTS `avaliacaospace` /*!40100 DEFAULT CHARACTER SET utf8 */;
USE `avaliacaospace`;
-- MySQL dump 10.13  Distrib 5.6.17, for Win64 (x86_64)
--
-- Host: localhost    Database: avaliacaospace
-- ------------------------------------------------------
-- Server version	5.6.22-log
-- ============================================
-- SCRIPT COMPLETO COM TRIGGERS WEBSOCKET + LÓGICA ORIGINAL
-- ============================================

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

-- ============================================
-- TABELA DE LOG PARA WEBSOCKET
-- ============================================
DROP TABLE IF EXISTS `database_change_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `database_change_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `table_name` varchar(100) NOT NULL,
  `action` varchar(10) NOT NULL,
  `record_id` varchar(100) DEFAULT NULL,
  `data` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_id_created` (`id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tipo_criterio`
--

DROP TABLE IF EXISTS `tipo_criterio`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tipo_criterio` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `descricao` varchar(255) NOT NULL,
  `valor_nvl_1` decimal(10,2) NOT NULL DEFAULT '0.00',
  `valor_nvl_2` decimal(10,2) NOT NULL DEFAULT '0.00',
  `valor_nvl_3` decimal(10,2) NOT NULL DEFAULT '0.00',
  `valor_spa` decimal(10,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tipo_criterio`
--

LOCK TABLES `tipo_criterio` WRITE;
/*!40000 ALTER TABLE `tipo_criterio` DISABLE KEYS */;
INSERT INTO `tipo_criterio` VALUES (1,'GERENCIA',299.50,355.47,441.01,479.00),(2,'AVALIACAO 360',300.00,300.00,300.00,300.00),(3,'AVALIACAO METAS',200.00,200.00,200.00,200.00);
/*!40000 ALTER TABLE `tipo_criterio` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `operadores`
--

LOCK TABLES `operadores` WRITE;
/*!40000 ALTER TABLE `operadores` DISABLE KEYS */;
INSERT INTO `operadores` VALUES (1,'Ana Carolina Ribeiro','anacarolina@spaceinformatica.com.br',1,4,'2025-09-04 12:56:28',1,'Nivel 3'),(2,'Erick Douglas','erick@spaceinformatica.com.br',1,4,'2025-09-04 12:56:28',1,'Nivel 1'),(3,'Evandro Pereira','evandro@spaceinformatica.com.br',1,4,'2025-09-04 12:56:28',1,'Nivel 2'),(4,'Gabriel Medeiros','gabrielmedeiros@spaceinformatica.com.br',1,4,'2025-09-04 12:56:28',1,'Nivel 1'),(5,'Jonathan Nascimento','jonathan.nascimento@spaceinformatica.com.br',1,4,'2025-09-04 12:56:28',1,'Nivel 1'),(6,'Luciano Augusto','luciano@spaceinformatica.com.br',1,4,'2025-09-04 12:56:28',1,'Nivel 2'),(7,'Luís Romero','luis.romero@spaceinformatica.com.br',1,4,'2025-09-04 12:56:28',1,'Nivel 2'),(8,'Mayara Duarte','mayaraduarte@spaceinformatica.com.br',1,4,'2025-09-04 12:56:28',1,'Nivel 1'),(9,'Paulo Silva','paulosilva@spaceinformatica.com.br',1,4,'2025-09-04 12:56:28',1,'Nivel 1'),(10,'Samuel Ivens','samuelxavier@spaceinformatica.com.br',1,4,'2025-09-04 12:56:28',1,'Nivel 2'),(11,'Wesley Fagundes','wesleylima@spaceinformatica.com.br',1,4,'2025-09-04 12:56:28',1,'Nivel 2'),(12,'Daniel Sammy','danielsammy@spaceinformatica.com.br',1,0,'2025-09-11 16:15:40',0,'Nivel 3');
/*!40000 ALTER TABLE `operadores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `criterios`
--

DROP TABLE IF EXISTS `criterios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `criterios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_tp_criterio` int(11) NOT NULL,
  `nome` varchar(255) NOT NULL,
  `tipo` enum('qualitativo','quantitativo') NOT NULL,
  `tipo_meta` enum('maior_melhor','menor_melhor') NOT NULL,
  `ordem` int(11) DEFAULT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `valor_meta` int(11) NOT NULL DEFAULT '0',
  `media_geral` tinyint(1) NOT NULL DEFAULT '0',
  `valor_criterio` decimal(10,2) DEFAULT '0.00',
  `id_meta_c` int(11) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `criterio_tipo` (`id`,`id_tp_criterio`) USING BTREE,
  KEY `fk_criterio_tipo` (`id_tp_criterio`),
  CONSTRAINT `fk_criterio_tipo` FOREIGN KEY (`id_tp_criterio`) REFERENCES `tipo_criterio` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `criterios`
--

LOCK TABLES `criterios` WRITE;
/*!40000 ALTER TABLE `criterios` DISABLE KEYS */;
INSERT INTO `criterios` VALUES (1,3,'Ticket concluído no primeiro contato dentro de 1 hora ','qualitativo','maior_melhor',1,1,10,0,70.00,1),
(2,3,'Preenchimento incorreto de Ticktes ','quantitativo','menor_melhor',2,1,5,0,0.00,4),
(3,3,'Satisfação/Avaliação de Clientes ','qualitativo','maior_melhor',3,1,3,0,0.00,3),
(4,3,'Solicitação de apoio Indevido ','quantitativo','menor_melhor',4,1,5,0,0.00,5),
(5,3,'Reabertura de Tiket ','qualitativo','menor_melhor',5,1,15,0,0.00,0),
(6,3,'Quantidade de Concluídos no mês ','quantitativo','maior_melhor',6,1,145,1,0.00,2),
(7,2,'Entrega soluções precisas e eficazes para as demandas apresentadas pelos clientes.','qualitativo','maior_melhor',8,1,85,0,0.00,0),
(8,2,'Comunica-se com clareza e objetividade, garantindo compreensão de colaboradores e clientes.','qualitativo','maior_melhor',9,1,85,0,0.00,0),
(9,2,'Lida com clientes difíceis e situações de estresse de forma profissional.','qualitativo','maior_melhor',10,1,85,0,0.00,0),
(10,2,'Responde com agilidade e eficiência, evitando atrasos desnecessários.','qualitativo','maior_melhor',11,1,85,0,0.00,0),
(11,2,'Mantém postura e atitudes proativas.','qualitativo','maior_melhor',12,1,85,0,0.00,0),
(12,2,'Trata todos com respeito e educação, promove cooperação, aceita diferenças e fala com assertividade o necessário.','qualitativo','maior_melhor',13,1,85,0,0.00,0),
(13,2,'Permanece alinhado(a) às metas e objetivos, fortalecendo a coesão da equipe.','qualitativo','maior_melhor',14,1,85,0,0.00,0),
(14,2,'Age com responsabilidade, prioriza atendimentos e usa o expediente de forma adequada.','qualitativo','maior_melhor',15,1,85,0,0.00,0),
(15,2,'Busca aprendizado contínuo, evolui profissionalmente e propõe soluções inovadoras.','qualitativo','maior_melhor',16,1,85,0,0.00,0),
(16,2,'Compreende processos dos clientes de ponta a ponta e resolve problemas sem acionar colegas indevidamente.','qualitativo','maior_melhor',17,1,85,0,0.00,0),
(17,2,'Evita distrações no expediente, limitando uso pessoal de celular, redes sociais e entretenimento.','qualitativo','maior_melhor',18,1,85,0,0.00,0),
(18,2,'Colabora ativamente para construir soluções e compartilhar conhecimento.','qualitativo','maior_melhor',19,1,85,0,0.00,0),
(19,1,'Cumpre as normas de entidade e os compromissos de trabalho, não solicitou folga/banco de horas parciais ou totais por mais de 2 vezes no mesmo mês','qualitativo','maior_melhor',20,1,75,0,0.00,0);
/*!40000 ALTER TABLE `criterios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `avaliacoes`
--

DROP TABLE IF EXISTS `avaliacoes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `avaliacoes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `operador_id` int(11) NOT NULL,
  `periodo` varchar(7) NOT NULL,
  `valor_total_meta` decimal(10,2) NOT NULL,
  `data_criacao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `data_ultima_edicao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_avaliacoes_operador` (`operador_id`),
  CONSTRAINT `fk_avaliacoes_operador` FOREIGN KEY (`operador_id`) REFERENCES `operadores` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

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
  `valor_objetivo` decimal(10,2) NOT NULL,
  `valor_alcancado` decimal(10,2) NOT NULL,
  `meta_objetivo` int(11) NOT NULL,
  `meta_alcancada` decimal(10,2) NOT NULL,
  `meta_atingida` tinyint(1) NOT NULL,
  `avaliado_id` int(11) NOT NULL,
  `avaliador_id` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_avaliacao` (`avaliacao_id`),
  KEY `fk_criterio` (`criterio_id`),
  KEY `fk_operador` (`avaliado_id`) USING BTREE,
  CONSTRAINT `fk_avaliacao` FOREIGN KEY (`avaliacao_id`) REFERENCES `avaliacoes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_criterio` FOREIGN KEY (`criterio_id`) REFERENCES `criterios` (`id`),
  CONSTRAINT `fk_operador` FOREIGN KEY (`avaliado_id`) REFERENCES `operadores` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `calculo_meta_criterio`
--

DROP TABLE IF EXISTS `calculo_meta_criterio`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `calculo_meta_criterio` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `descricao_calc` varchar(45) NOT NULL,
  `formula` longtext,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `calculo_meta_criterio`
--

LOCK TABLES `calculo_meta_criterio` WRITE;
/*!40000 ALTER TABLE `calculo_meta_criterio` DISABLE KEYS */;
INSERT INTO `calculo_meta_criterio` VALUES (1,'PRIMEIRO_CONTATO','Resultado(%) = (Quantidade concluida no primeiro contato / quantitativo do periodo ) × 100'),(2,'QUANTITATIVO','Resultado=(Quantidade do perÍodo / Quantidade do operador​) × 0,8'),(3,'SATISFACAO_CLIENTE','Cada resposta é multiplicada pela quantidade de estrelas recebidas.\r\n\r\n	Totali​=(Quantidade de respostas com i estrelas)×i\r\n\r\nDepois, soma-se todos os totais:\r\n\r\n	Soma=Total1​+Total2​+Total3​+Total4​+Total5​\r\n\r\nEm seguida divide pelo número total de respostas:\r\n	\r\n	Média= Quantidade total de respostas / Soma​'),(4,'PREENCHIMENTO_INCORRETO','Premiação\n\n0 tickets insatisfatórios → 100% premiação\n\nAté 2 tickets insatisfatórios → 80% premiação\n\n3 tickets insatisfatórios → 60% premiação\n\n4 tickets insatisfatórios → 40% premiação\n\n5 ou mais tickets insatisfatórios → 0% premiação'),(5,'APOIO_INDEVIDO',' ');
/*!40000 ALTER TABLE `calculo_meta_criterio` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `premio_nivel`
--

DROP TABLE IF EXISTS `premio_nivel`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `premio_nivel` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nivel` enum('Nivel 1','Nivel 2','Nivel 3','Sup Avançado') NOT NULL,
  `valor_premio` decimal(10,2) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_premio_nivel_nivel` (`nivel`)
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `premio_nivel`
--

LOCK TABLES `premio_nivel` WRITE;
/*!40000 ALTER TABLE `premio_nivel` DISABLE KEYS */;
INSERT INTO `premio_nivel` VALUES (1,'Nivel 1',799.50),(2,'Nivel 2',855.47),(3,'Nivel 3',941.01),(4,'Sup Avançado',979.00);
/*!40000 ALTER TABLE `premio_nivel` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8;
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

-- ============================================
-- Script de Triggers MySQL - WebSocket + Lógica de Resumo
-- BANCO: avaliacaospace
-- ============================================
-- Este script combina:
-- 1. Registro de mudanças para WebSocket (database_change_log)
-- 2. Atualização de resumo de operadores (lógica original)

-- IMPORTANTE: Execute este script NO BANCO avaliacaospace
USE avaliacaospace;

-- ============================================
-- 1. TABELA DE LOG PARA WEBSOCKET
-- ============================================
CREATE TABLE IF NOT EXISTS database_change_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    action VARCHAR(10) NOT NULL,
    record_id VARCHAR(100),
    data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_created_at (created_at),
    INDEX idx_id_created (id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 1. FUNCAO ATUALIZA_RESULTADO_OPERADOR
-- ============================================

DELIMITER $$

DROP PROCEDURE IF EXISTS `atualiza_resultado_operador_periodo`$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `atualiza_resultado_operador_periodo`(
    IN p_id_operador INT,
    IN p_periodo     VARCHAR(7)
)
BEGIN
    DECLARE v_total_meta    DECIMAL(10,2) DEFAULT 0;
    DECLARE v_total_apurado DECIMAL(18,4) DEFAULT 0;

    -- 1) total_meta
    SELECT COALESCE(a.valor_total_meta, 0)
      INTO v_total_meta
      FROM avaliacoes a
     WHERE a.operador_id = p_id_operador
       AND a.periodo     = p_periodo
     LIMIT 1;

    -- 2) total_apurado: soma das pontuações por critério (usando média por critério)
    SELECT COALESCE(SUM(
        CASE t.tipo_meta
          WHEN 'maior_melhor' THEN
            CASE
              WHEN t.meta_objetivo > 0 THEN
                CASE
                  WHEN t.avg_meta >= t.meta_objetivo
                    THEN t.valor_objetivo
                  ELSE (t.avg_meta / NULLIF(t.meta_objetivo, 0)) * t.valor_objetivo
                END
              ELSE 0
            END

          WHEN 'menor_melhor' THEN
            CASE
              WHEN t.meta_objetivo <= 0 THEN
                CASE WHEN t.avg_meta <= 0 THEN t.valor_objetivo ELSE 0 END
              WHEN t.avg_meta <= 0 THEN
                t.valor_objetivo
              ELSE
                (1 - (t.avg_meta / NULLIF(t.meta_objetivo, 0))) * t.valor_objetivo
            END
        END
    ), 0)
    INTO v_total_apurado
    FROM (
        SELECT
            ac.criterio_id,
            c.tipo_meta,
            AVG(ac.meta_alcancada) AS avg_meta,
            MAX(ac.meta_objetivo)  AS meta_objetivo,
            MAX(ac.valor_objetivo) AS valor_objetivo
        FROM avaliacao_criterios ac
        JOIN avaliacoes a ON a.id = ac.avaliacao_id
        JOIN criterios  c ON c.id = ac.criterio_id
        WHERE a.operador_id = p_id_operador
          AND a.periodo     = p_periodo
        GROUP BY ac.criterio_id, c.tipo_meta
    ) t;

    -- 3) UPSERT no resumo
    INSERT INTO resultado_operador (id_operador, periodo, total_meta, total_apurado)
    VALUES (p_id_operador, p_periodo, v_total_meta, ROUND(v_total_apurado, 2))
    ON DUPLICATE KEY UPDATE
        total_meta    = VALUES(total_meta),
        total_apurado = VALUES(total_apurado);
END$$

DELIMITER ;

-- ============================================
-- 2. TRIGGERS PARA AVALIACAO_CRITERIOS
-- ============================================

-- Remover triggers existentes
DROP TRIGGER IF EXISTS trg_avaliacao_criterios_after_insert;
DROP TRIGGER IF EXISTS trg_avaliacao_criterios_after_update;
DROP TRIGGER IF EXISTS trg_avaliacao_criterios_after_delete;
DROP TRIGGER IF EXISTS trg_ai_criterios_atualiza_resumo;
DROP TRIGGER IF EXISTS trg_au_criterios_atualiza_resumo;
DROP TRIGGER IF EXISTS trg_ad_criterios_atualiza_resumo;

-- TRIGGER: INSERT em avaliacao_criterios
DELIMITER $$
CREATE TRIGGER trg_avaliacao_criterios_after_insert
AFTER INSERT ON avaliacao_criterios
FOR EACH ROW
BEGIN
    DECLARE v_op INT;
    DECLARE v_per VARCHAR(7);

    -- 1. REGISTRA NO LOG PARA WEBSOCKET
    INSERT INTO database_change_log (table_name, action, record_id, data, created_at)
    VALUES (
        'avaliacao_criterios',
        'CREATE',
        CAST(NEW.id AS CHAR),
        CONCAT(
            '{',
            '"id":"', COALESCE(CAST(NEW.id AS CHAR), ''), '",',
            '"avaliacao_id":"', COALESCE(CAST(NEW.avaliacao_id AS CHAR), ''), '",',
            '"criterio_id":"', COALESCE(CAST(NEW.criterio_id AS CHAR), ''), '",',
            '"valor_objetivo":"', COALESCE(CAST(NEW.valor_objetivo AS CHAR), ''), '",',
            '"valor_alcancado":"', COALESCE(CAST(NEW.valor_alcancado AS CHAR), ''), '",',
            '"meta_objetivo":"', COALESCE(CAST(NEW.meta_objetivo AS CHAR), ''), '",',
            '"meta_alcancada":"', COALESCE(CAST(NEW.meta_alcancada AS CHAR), ''), '",',
            '"meta_atingida":"', COALESCE(CAST(NEW.meta_atingida AS CHAR), ''), '",',
            '"avaliado_id":"', COALESCE(CAST(NEW.avaliado_id AS CHAR), ''), '",',
            '"avaliador_id":"', COALESCE(CAST(NEW.avaliador_id AS CHAR), ''), '"',
            '}'
        ),
        NOW()
    );

    -- 2. ATUALIZA RESUMO DO OPERADOR (LÓGICA ORIGINAL)
    SELECT a.operador_id, a.periodo
      INTO v_op, v_per
      FROM avaliacoes a
     WHERE a.id = NEW.avaliacao_id;

    CALL atualiza_resultado_operador_periodo (v_op, v_per);
END$$
DELIMITER ;

-- TRIGGER: UPDATE em avaliacao_criterios
DELIMITER $$
CREATE TRIGGER trg_avaliacao_criterios_after_update
AFTER UPDATE ON avaliacao_criterios
FOR EACH ROW
BEGIN
    DECLARE v_op_new INT;
    DECLARE v_per_new VARCHAR(7);
    DECLARE v_op_old INT;
    DECLARE v_per_old VARCHAR(7);

    -- 1. REGISTRA NO LOG PARA WEBSOCKET
    INSERT INTO database_change_log (table_name, action, record_id, data, created_at)
    VALUES (
        'avaliacao_criterios',
        'UPDATE',
        CAST(NEW.id AS CHAR),
        CONCAT(
            '{',
            '"id":"', COALESCE(CAST(NEW.id AS CHAR), ''), '",',
            '"avaliacao_id":"', COALESCE(CAST(NEW.avaliacao_id AS CHAR), ''), '",',
            '"criterio_id":"', COALESCE(CAST(NEW.criterio_id AS CHAR), ''), '",',
            '"valor_objetivo":"', COALESCE(CAST(NEW.valor_objetivo AS CHAR), ''), '",',
            '"valor_alcancado":"', COALESCE(CAST(NEW.valor_alcancado AS CHAR), ''), '",',
            '"meta_objetivo":"', COALESCE(CAST(NEW.meta_objetivo AS CHAR), ''), '",',
            '"meta_alcancada":"', COALESCE(CAST(NEW.meta_alcancada AS CHAR), ''), '",',
            '"meta_atingida":"', COALESCE(CAST(NEW.meta_atingida AS CHAR), ''), '",',
            '"avaliado_id":"', COALESCE(CAST(NEW.avaliado_id AS CHAR), ''), '",',
            '"avaliador_id":"', COALESCE(CAST(NEW.avaliador_id AS CHAR), ''), '"',
            '}'
        ),
        NOW()
    );

    -- 2. ATUALIZA RESUMO DO OPERADOR (LÓGICA ORIGINAL)
    -- Par novo
    SELECT a.operador_id, a.periodo
      INTO v_op_new, v_per_new
      FROM avaliacoes a
     WHERE a.id = NEW.avaliacao_id;

    CALL atualiza_resultado_operador_periodo (v_op_new, v_per_new);

    -- Se mudou a avaliação, atualiza também o par antigo
    IF NEW.avaliacao_id <> OLD.avaliacao_id THEN
        SELECT a.operador_id, a.periodo
          INTO v_op_old, v_per_old
          FROM avaliacoes a
         WHERE a.id = OLD.avaliacao_id;

        CALL atualiza_resultado_operador_periodo (v_op_old, v_per_old);
    END IF;
END$$
DELIMITER ;

-- TRIGGER: DELETE em avaliacao_criterios
DELIMITER $$
CREATE TRIGGER trg_avaliacao_criterios_after_delete
AFTER DELETE ON avaliacao_criterios
FOR EACH ROW
BEGIN
    DECLARE v_op INT;
    DECLARE v_per VARCHAR(7);

    -- 1. REGISTRA NO LOG PARA WEBSOCKET
    INSERT INTO database_change_log (table_name, action, record_id, data, created_at)
    VALUES (
        'avaliacao_criterios',
        'DELETE',
        CAST(OLD.id AS CHAR),
        CONCAT(
            '{',
            '"id":"', COALESCE(CAST(OLD.id AS CHAR), ''), '",',
            '"avaliacao_id":"', COALESCE(CAST(OLD.avaliacao_id AS CHAR), ''), '",',
            '"criterio_id":"', COALESCE(CAST(OLD.criterio_id AS CHAR), ''), '",',
            '"valor_objetivo":"', COALESCE(CAST(OLD.valor_objetivo AS CHAR), ''), '",',
            '"valor_alcancado":"', COALESCE(CAST(OLD.valor_alcancado AS CHAR), ''), '",',
            '"meta_objetivo":"', COALESCE(CAST(OLD.meta_objetivo AS CHAR), ''), '",',
            '"meta_alcancada":"', COALESCE(CAST(OLD.meta_alcancada AS CHAR), ''), '",',
            '"meta_atingida":"', COALESCE(CAST(OLD.meta_atingida AS CHAR), ''), '",',
            '"avaliado_id":"', COALESCE(CAST(OLD.avaliado_id AS CHAR), ''), '",',
            '"avaliador_id":"', COALESCE(CAST(OLD.avaliador_id AS CHAR), ''), '"',
            '}'
        ),
        NOW()
    );

    -- 2. ATUALIZA RESUMO DO OPERADOR (LÓGICA ORIGINAL)
    SELECT a.operador_id, a.periodo
      INTO v_op, v_per
      FROM avaliacoes a
     WHERE a.id = OLD.avaliacao_id;

    CALL atualiza_resultado_operador_periodo (v_op, v_per);
END$$
DELIMITER ;

-- ============================================
-- 3. TRIGGERS PARA AVALIACOES
-- ============================================

-- Remover triggers existentes
DROP TRIGGER IF EXISTS trg_avaliacoes_after_insert;
DROP TRIGGER IF EXISTS trg_avaliacoes_after_update;
DROP TRIGGER IF EXISTS trg_avaliacoes_after_delete;
DROP TRIGGER IF EXISTS trg_ai_avaliacoes_atualiza_resumo;
DROP TRIGGER IF EXISTS trg_au_avaliacoes_atualiza_resumo;
DROP TRIGGER IF EXISTS trg_ad_avaliacoes_atualiza_resumo;

-- TRIGGER: INSERT em avaliacoes
DELIMITER $$
CREATE TRIGGER trg_avaliacoes_after_insert
AFTER INSERT ON avaliacoes
FOR EACH ROW
BEGIN
    -- 1. REGISTRA NO LOG PARA WEBSOCKET
    INSERT INTO database_change_log (table_name, action, record_id, data, created_at)
    VALUES (
        'avaliacoes',
        'CREATE',
        CAST(NEW.id AS CHAR),
        CONCAT(
            '{',
            '"id":"', COALESCE(CAST(NEW.id AS CHAR), ''), '",',
            '"operador_id":"', COALESCE(CAST(NEW.operador_id AS CHAR), ''), '",',
            '"periodo":"', COALESCE(NEW.periodo, ''), '",',
            '"valor_total_meta":"', COALESCE(CAST(NEW.valor_total_meta AS CHAR), ''), '"',
            '}'
        ),
        NOW()
    );

    -- 2. ATUALIZA RESUMO DO OPERADOR (LÓGICA ORIGINAL)
    CALL atualiza_resultado_operador_periodo (NEW.operador_id, NEW.periodo);
END$$
DELIMITER ;

-- TRIGGER: UPDATE em avaliacoes
DELIMITER $$
CREATE TRIGGER trg_avaliacoes_after_update
AFTER UPDATE ON avaliacoes
FOR EACH ROW
BEGIN
    -- 1. REGISTRA NO LOG PARA WEBSOCKET
    INSERT INTO database_change_log (table_name, action, record_id, data, created_at)
    VALUES (
        'avaliacoes',
        'UPDATE',
        CAST(NEW.id AS CHAR),
        CONCAT(
            '{',
            '"id":"', COALESCE(CAST(NEW.id AS CHAR), ''), '",',
            '"operador_id":"', COALESCE(CAST(NEW.operador_id AS CHAR), ''), '",',
            '"periodo":"', COALESCE(NEW.periodo, ''), '",',
            '"valor_total_meta":"', COALESCE(CAST(NEW.valor_total_meta AS CHAR), ''), '"',
            '}'
        ),
        NOW()
    );

    -- 2. ATUALIZA RESUMO DO OPERADOR (LÓGICA ORIGINAL)
    -- Atualiza o par novo
    CALL atualiza_resultado_operador_periodo (NEW.operador_id, NEW.periodo);

    -- Se mudou operador e/ou período, atualiza também o par antigo
    IF (NEW.operador_id <> OLD.operador_id) OR (NEW.periodo <> OLD.periodo) THEN
        CALL atualiza_resultado_operador_periodo (OLD.operador_id, OLD.periodo);
    END IF;
END$$
DELIMITER ;

-- TRIGGER: DELETE em avaliacoes
DELIMITER $$
CREATE TRIGGER trg_avaliacoes_after_delete
AFTER DELETE ON avaliacoes
FOR EACH ROW
BEGIN
    -- 1. REGISTRA NO LOG PARA WEBSOCKET
    INSERT INTO database_change_log (table_name, action, record_id, data, created_at)
    VALUES (
        'avaliacoes',
        'DELETE',
        CAST(OLD.id AS CHAR),
        CONCAT(
            '{',
            '"id":"', COALESCE(CAST(OLD.id AS CHAR), ''), '",',
            '"operador_id":"', COALESCE(CAST(OLD.operador_id AS CHAR), ''), '",',
            '"periodo":"', COALESCE(OLD.periodo, ''), '",',
            '"valor_total_meta":"', COALESCE(CAST(OLD.valor_total_meta AS CHAR), ''), '"',
            '}'
        ),
        NOW()
    );

    -- 2. ATUALIZA RESUMO DO OPERADOR (LÓGICA ORIGINAL)
    CALL atualiza_resultado_operador_periodo (OLD.operador_id, OLD.periodo);
END$$
DELIMITER ;

-- ============================================
-- 4. PROCEDURE DE MANUTENÇÃO
-- ============================================

DROP PROCEDURE IF EXISTS sp_cleanup_change_log;

DELIMITER $$
CREATE PROCEDURE sp_cleanup_change_log(IN days_to_keep INT)
BEGIN
    DELETE FROM database_change_log
    WHERE created_at < DATE_SUB(NOW(), INTERVAL days_to_keep DAY);

    SELECT CONCAT('Removidos ', ROW_COUNT(), ' registros antigos') AS result;
END$$
DELIMITER ;

-- ============================================
-- INSTRUÇÕES DE USO
-- ============================================
-- 1. Execute este script no banco avaliacaospace
-- 2. As triggers combinam:
--    - Registro de mudanças no database_change_log (para WebSocket)
--    - Chamada da procedure atualiza_resultado_operador_periodo (lógica original)
-- 3. Para limpar logs antigos: CALL sp_cleanup_change_log(30);

-- FIM DO SCRIPT