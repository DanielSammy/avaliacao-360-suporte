// script para empacotar o diretório `dist` em um arquivo .war
// usa `archiver` para criar um zip com estrutura WAR (Tomcat 9)
// como saída cria `dist/avaliacao360.war`

import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

const DIST_DIR = path.resolve(process.cwd(), 'dist');
// coloque o WAR fora de `dist` para evitar incluir o próprio WAR dentro do arquivo
const OUT_FILE = path.resolve(process.cwd(), 'avaliacao360.war');

async function ensureWebInf() {
  const webInfDir = path.join(DIST_DIR, 'WEB-INF');
  if (!fs.existsSync(webInfDir)) fs.mkdirSync(webInfDir, { recursive: true });

  const webXmlPath = path.join(webInfDir, 'web.xml');
  if (!fs.existsSync(webXmlPath)) {
    const webXmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n<web-app xmlns="http://xmlns.jcp.org/xml/ns/javaee"\n         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n         xsi:schemaLocation="http://xmlns.jcp.org/xml/ns/javaee http://xmlns.jcp.org/xml/ns/javaee/web-app_3_0.xsd"\n         version="3.0">\n  <display-name>Avaliação 360 Suporte</display-name>\n  <welcome-file-list>\n    <welcome-file>index.html</welcome-file>\n  </welcome-file-list>\n</web-app>`;
    fs.writeFileSync(webXmlPath, webXmlContent, { encoding: 'utf8' });
  }
}

async function pack() {
  if (!fs.existsSync(DIST_DIR)) {
    console.error('Diretório dist não encontrado. Rode `npm run build` antes.');
    process.exit(1);
  }

  await ensureWebInf();

  // remover WAR anterior, se existir, para evitar inclusão antiga
  if (fs.existsSync(OUT_FILE)) fs.unlinkSync(OUT_FILE);

  const output = fs.createWriteStream(OUT_FILE);
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', function () {
    console.log(`WAR criado em: ${OUT_FILE} (${archive.pointer()} bytes)`);
    try {
      // também copie o WAR para dist para pipelines que esperam o artefato lá
      const destInDist = path.join(DIST_DIR, path.basename(OUT_FILE));
      fs.copyFileSync(OUT_FILE, destInDist);
      console.log(`WAR copiado para: ${destInDist}`);
    } catch (err) {
      console.warn('Falha ao copiar WAR para dist:', err?.message || err);
    }
  });

  archive.on('warning', function (err) {
    if (err.code === 'ENOENT') {
      console.warn('Aviso do archiver:', err.message);
    } else {
      throw err;
    }
  });

  archive.on('error', function (err) {
    throw err;
  });

  archive.pipe(output);

  // adicionar todos os arquivos do dist, preservando a estrutura relativa
  // (o arquivo de saída está fora de `dist`, então não será incluído)
  archive.directory(DIST_DIR, false);

  await archive.finalize();
}

pack().catch((err) => {
  console.error('Erro ao criar WAR:', err);
  process.exit(1);
});
