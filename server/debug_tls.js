const https = require('https');
const forge = require('node-forge');
const fs = require('fs');
const path = require('path');
const tls = require('tls');

const pfxPath = 'C:\\Users\\pedro.paiva\\Documents\\Certificados\\M B CONTABILIDADE_senha 21601471_venc 14-07-26.pfx';
const password = '21601471';
const targetUrl = 'https://www.nfse.gov.br/EmissorNacional/Certificado';

async function test() {
    console.log('Testing connection to:', targetUrl);

    const pfxBuffer = fs.readFileSync(pfxPath);

    // Test 1: Using cert/key extraction (current implementation)
    console.log('\n--- Test 1: Cert/Key extraction ---');
    try {
        const p12Asn1 = forge.asn1.fromDer(pfxBuffer.toString('binary'));
        const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);
        const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
        const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] ||
            p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] || [];

        const keyPem = forge.pki.privateKeyToPem(keyBags[0].key);
        const certPem = certBags.map(b => forge.pki.certificateToPem(b.cert)).join('\n');

        const agent = new https.Agent({
            cert: certPem,
            key: keyPem,
            rejectUnauthorized: false,
            maxVersion: 'TLSv1.2'
        });

        await makeRequest(agent, 'Test 1');
    } catch (e) {
        console.error('Test 1 failed:', e.message);
    }

    // Test 2: Using direct PFX
    console.log('\n--- Test 2: Direct PFX ---');
    try {
        const agent = new https.Agent({
            pfx: pfxBuffer,
            passphrase: password,
            rejectUnauthorized: false,
            maxVersion: 'TLSv1.2'
        });
        await makeRequest(agent, 'Test 2');
    } catch (e) {
        console.error('Test 2 failed:', e.message);
    }
}

function makeRequest(agent, label) {
    return new Promise((resolve, reject) => {
        const req = https.get(targetUrl, {
            agent,
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        }, (res) => {
            console.log(`${label} Status:`, res.statusCode);
            console.log(`${label} Headers:`, JSON.stringify(res.headers, null, 2));
            console.log(`${label} Final URL:`, res.headers.location || 'N/A');

            // Get TLS socket details
            const socket = res.socket;
            console.log(`${label} Protocol:`, socket.getProtocol());
            console.log(`${label} Cipher:`, JSON.stringify(socket.getCipher(), null, 2));

            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (body.includes('/EmissorNacional/Login')) {
                    console.log(`${label} result: REDIRECTED TO LOGIN`);
                } else if (body.includes('/EmissorNacional/Dashboard')) {
                    console.log(`${label} result: SUCCESS (DASHBOARD)`);
                } else {
                    console.log(`${label} result: UNKNOWN RESPONSE (length $ {body.length})`);
                    fs.writeFileSync(`C:\\tmp\\debug_${label.replace(' ', '_')}.html`, body);
                }
                resolve();
            });
        });

        req.on('error', (e) => {
            console.error(`${label} Request Error:`, e.stack);
            reject(e);
        });
    });
}

test();
