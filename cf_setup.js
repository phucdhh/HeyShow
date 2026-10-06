const https = require('https');
const crypto = require('crypto');

// KHÔNG hardcode secret vào file này: file nằm trong Google Drive và được rsync lên Fold 4.
// Truyền qua biến môi trường, ví dụ:
//   CF_ACCOUNT_ID=... CF_ZONE_ID=... CF_API_TOKEN=... node cf_setup.js
const accountId = process.env.CF_ACCOUNT_ID;
const zoneId = process.env.CF_ZONE_ID;
const apiToken = process.env.CF_API_TOKEN;
const tunnelName = process.env.CF_TUNNEL_NAME || 'heyshow-fold4-tunnel';
const domain = process.env.CF_DOMAIN || 'heyshow.pedu.vn';

const missing = [
    ['CF_ACCOUNT_ID', accountId],
    ['CF_ZONE_ID', zoneId],
    ['CF_API_TOKEN', apiToken],
].filter(([, value]) => !value).map(([name]) => name);

if (missing.length) {
    console.error('Thiếu biến môi trường: ' + missing.join(', '));
    console.error(`
Cách dùng:
  export CF_ACCOUNT_ID="<Cloudflare Account ID>"
  export CF_ZONE_ID="<Zone ID của pedu.vn>"
  export CF_API_TOKEN="<API token, quyền Account.Cloudflare Tunnel:Edit + Zone.DNS:Edit>"
  node cf_setup.js

Hoặc chạy một dòng:
  CF_ACCOUNT_ID=... CF_ZONE_ID=... CF_API_TOKEN=... node cf_setup.js`);
    process.exit(1);
}

console.log(`Đang cấu hình tunnel "${tunnelName}" cho ${domain} (account ${accountId.slice(0, 8)}...)`);

async function fetchCF(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.cloudflare.com',
            port: 443,
            path: `/client/v4${path}`,
            method: method,
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch(e) {
                    resolve(data);
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function main() {
    try {
        console.log('1. Checking existing tunnels...');
        const tunnels = await fetchCF('GET', `/accounts/${accountId}/cfd_tunnel`);
        let tunnel = tunnels.result.find(t => t.name === tunnelName);
        let tunnelSecret;

        if (!tunnel) {
            console.log('2. Creating new tunnel...');
            tunnelSecret = crypto.randomBytes(32).toString('base64');
            const newTunnel = await fetchCF('POST', `/accounts/${accountId}/cfd_tunnel`, {
                name: tunnelName,
                tunnel_secret: tunnelSecret
            });
            if (!newTunnel.success) throw new Error(JSON.stringify(newTunnel.errors));
            tunnel = newTunnel.result;
            console.log('Tunnel created:', tunnel.id);
        } else {
            console.log('Tunnel already exists:', tunnel.id);
            // Can't retrieve secret for existing tunnel, need to recreate or we just assume we can recreate
            console.log('Deleting existing tunnel to recreate with known secret...');
            await fetchCF('DELETE', `/accounts/${accountId}/cfd_tunnel/${tunnel.id}`);
            
            tunnelSecret = crypto.randomBytes(32).toString('base64');
            const newTunnel = await fetchCF('POST', `/accounts/${accountId}/cfd_tunnel`, {
                name: tunnelName,
                tunnel_secret: tunnelSecret
            });
            tunnel = newTunnel.result;
            console.log('Recreated tunnel:', tunnel.id);
        }

        console.log('3. Configuring tunnel routing (Ingress)...');
        const configRes = await fetchCF('PUT', `/accounts/${accountId}/cfd_tunnel/${tunnel.id}/configurations`, {
            config: {
                ingress: [
                    { hostname: domain, service: 'http://localhost:3000' },
                    { service: 'http_status:404' }
                ]
            }
        });
        if (!configRes.success) throw new Error(JSON.stringify(configRes.errors));

        console.log('4. Checking DNS records...');
        const dnsRecords = await fetchCF('GET', `/zones/${zoneId}/dns_records?name=${domain}`);
        const cnameValue = `${tunnel.id}.cfargotunnel.com`;
        
        if (dnsRecords.result.length > 0) {
            console.log('Updating DNS record...');
            await fetchCF('PUT', `/zones/${zoneId}/dns_records/${dnsRecords.result[0].id}`, {
                type: 'CNAME',
                name: domain,
                content: cnameValue,
                proxied: true
            });
        } else {
            console.log('Creating DNS record...');
            await fetchCF('POST', `/zones/${zoneId}/dns_records`, {
                type: 'CNAME',
                name: domain,
                content: cnameValue,
                proxied: true
            });
        }

        // Generate Token
        const tokenData = {
            a: accountId,
            t: tunnel.id,
            s: tunnelSecret
        };
        const tokenBase64 = Buffer.from(JSON.stringify(tokenData)).toString('base64');
        
        console.log('\n=== SUCCESS ===');
        console.log('TUNNEL_TOKEN=' + tokenBase64);
        
    } catch (e) {
        console.error('Error:', e);
    }
}

main();