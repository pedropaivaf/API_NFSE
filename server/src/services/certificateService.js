'use strict';
const forge = require('node-forge');
const fs = require('fs');
const path = require('path');
const os = require('os');

function getCertDir() {
    return path.join(os.homedir(), 'Documents', 'Certificados');
}

function validateCertificate(filename, password) {
    const pfxPath = path.join(getCertDir(), filename);
    if (!fs.existsSync(pfxPath)) {
        throw new Error(`Certificado não encontrado: ${pfxPath}`);
    }

    const pfxBuffer = fs.readFileSync(pfxPath);
    const p12Asn1 = forge.asn1.fromDer(pfxBuffer.toString('binary'));
    // Lança exceção se senha errada
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);

    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = certBags[forge.pki.oids.certBag]?.[0];
    if (!certBag) throw new Error('Certificado não encontrado no .pfx');

    const cert = certBag.cert;
    const subject = cert.subject.attributes;
    const rawCn = subject.find(a => a.shortName === 'CN')?.value || '';
    const cn = rawCn.includes(':') ? rawCn.split(':')[0].trim() : rawCn;
    const cnpjMatch = rawCn.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{14}/);
    const cnpj = cnpjMatch ? cnpjMatch[0] : null;
    const notBefore = cert.validity.notBefore;
    const notAfter = cert.validity.notAfter;
    const now = new Date();

    if (now < notBefore) throw new Error('Certificado ainda não é válido');
    if (now > notAfter) throw new Error('Certificado expirado em ' + notAfter.toLocaleDateString('pt-BR'));

    return { valid: true, cn, cnpj, notBefore, notAfter };
}

module.exports = { validateCertificate, getCertDir };
