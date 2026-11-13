-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 10-11-2026 a las 16:05:17
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `db-crabook`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `libro`
--

CREATE TABLE `libro` (
  `ID_LIBRO` int(11) NOT NULL,
  `CODIGO_DE_BARRA` varchar(50) NOT NULL,
  `TITULO` varchar(50) NOT NULL,
  `AUTOR` varchar(50) NOT NULL,
  `EDITORIAL` varchar(30) NOT NULL,
  `GENERO` varchar(20) NOT NULL,
  `N_COPIA` int(11) NOT NULL,
  `CDD` varchar(20) NOT NULL,
  `N_REGISTRO` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `prestar`
--

CREATE TABLE `prestar` (
  `ID_PRESTAR` int(11) NOT NULL,
  `ID_USUARIO` int(11) NOT NULL,
  `ID_LIBRO` int(11) NOT NULL,
  `FECHA_DEVOLUCION` date DEFAULT NULL,
  `FECHA_ENTREGA` date DEFAULT NULL,
  `ESTADO_LIBRO` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuario`
--

CREATE TABLE `usuario` (
  `ID_USUARIO` int(11) NOT NULL,
  `NOMBRE_USUARIO` varchar(50) NOT NULL,
  `RUT_USUARIO` varchar(13) NOT NULL,
  `CURSO_USUARIO` varchar(5) DEFAULT NULL,
  `ROL_USUARIO` varchar(25) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_spanish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cuenta`
-- Cuentas para entrar a la aplicación. La clave NUNCA se guarda: solo su hash (scrypt).
-- ROL_CUENTA: 'admin' (bibliotecaria, puede todo) o 'consulta' (solo busca libros).
-- ID_USUARIO queda vacío en las cuentas compartidas; sirve para ligar una cuenta a una persona en el futuro.
--

CREATE TABLE `cuenta` (
  `ID_CUENTA` int(11) NOT NULL,
  `NOMBRE_CUENTA` varchar(30) NOT NULL,
  `CLAVE_HASH` varchar(255) NOT NULL,
  `ROL_CUENTA` varchar(20) NOT NULL,
  `ID_USUARIO` int(11) DEFAULT NULL,
  `ACTIVA` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_spanish_ci;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `libro`
--
ALTER TABLE `libro`
  ADD PRIMARY KEY (`ID_LIBRO`),
  ADD UNIQUE KEY `LIBRO_PK` (`ID_LIBRO`);

--
-- Indices de la tabla `prestar`
--
ALTER TABLE `prestar`
  ADD PRIMARY KEY (`ID_PRESTAR`),
  ADD UNIQUE KEY `PRESTAR_PK` (`ID_PRESTAR`),
  ADD KEY `PRESTAR2_FK` (`ID_LIBRO`),
  ADD KEY `PRESTAR_FK` (`ID_USUARIO`);

--
-- Indices de la tabla `usuario`
--
ALTER TABLE `usuario`
  ADD PRIMARY KEY (`ID_USUARIO`),
  ADD UNIQUE KEY `USUARIO_PK` (`ID_USUARIO`);

--
-- Indices de la tabla `cuenta`
--
ALTER TABLE `cuenta`
  ADD PRIMARY KEY (`ID_CUENTA`),
  ADD UNIQUE KEY `CUENTA_NOMBRE_UK` (`NOMBRE_CUENTA`),
  ADD KEY `CUENTA_USUARIO_FK` (`ID_USUARIO`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `libro`
--
ALTER TABLE `libro`
  MODIFY `ID_LIBRO` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=0;

--
-- AUTO_INCREMENT de la tabla `prestar`
--
ALTER TABLE `prestar`
  MODIFY `ID_PRESTAR` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=0;

--
-- AUTO_INCREMENT de la tabla `usuario`
--
ALTER TABLE `usuario`
  MODIFY `ID_USUARIO` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=0;

--
-- AUTO_INCREMENT de la tabla `cuenta`
--
ALTER TABLE `cuenta`
  MODIFY `ID_CUENTA` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=0;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `prestar`
--
ALTER TABLE `prestar`
  ADD CONSTRAINT `FK_PRESTAR_PRESTAR2_LIBRO` FOREIGN KEY (`ID_LIBRO`) REFERENCES `libro` (`ID_LIBRO`),
  ADD CONSTRAINT `FK_PRESTAR_PRESTAR_USUARIO` FOREIGN KEY (`ID_USUARIO`) REFERENCES `usuario` (`ID_USUARIO`);

--
-- Filtros para la tabla `cuenta` (si se elimina a la persona, se elimina su cuenta)
--
ALTER TABLE `cuenta`
  ADD CONSTRAINT `FK_CUENTA_USUARIO` FOREIGN KEY (`ID_USUARIO`) REFERENCES `usuario` (`ID_USUARIO`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
