#!/bin/sh
set -e

echo "Pushing database schema..."
npx prisma db push --accept-data-loss

echo "Checking if seeding is needed..."
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function seed() {
  const count = await prisma.user.count();
  if (count > 0) {
    console.log('Database already seeded, skipping.');
    return;
  }

  const hash = await bcrypt.hash('Admin@123', 12);
  await prisma.user.create({ data: { username: 'admin', password: hash } });

  const entries = [
    { srNo: 1, serviceName: 'iskytransport.com', category: 'Domain', vendor: 'CloudFlare', expiryDate: new Date('2027-04-28'), autoRenewal: false, owner: 'Balasubramanian P', criticality: 'High', renewalPeriod: 1, remarks: 'Renewed & Moved Domain to CloudFlare-27-4-2026' },
    { srNo: 2, serviceName: 'nationalconsultingindia.com', category: 'Domain', vendor: 'CloudFlare', expiryDate: new Date('2027-05-17'), autoRenewal: false, owner: 'Balasubramanian P', criticality: 'High', renewalPeriod: 1, remarks: '17 May 2026 (Renewed)' },
    { srNo: 3, serviceName: 'nationalgroupindia.com', category: 'Domain', vendor: 'GoDaddy.com, LLC', expiryDate: new Date('2026-09-03'), autoRenewal: false, owner: 'Balasubramanian P', criticality: 'High', renewalPeriod: 1, annualCost: 1617, remarks: 'Renewed & Moved Domain to CloudFlare' },
    { srNo: 4, serviceName: 'nationalresourcesindia.com', category: 'Domain', vendor: 'CloudFlare', expiryDate: new Date('2027-05-17'), autoRenewal: false, owner: 'Balasubramanian P', criticality: 'High', renewalPeriod: 1, remarks: 'Renewed & Moved Domain to CloudFlare' },
    { srNo: 5, serviceName: 'reinlandautocorp.com', category: 'Domain', vendor: 'CloudFlare', expiryDate: new Date('2027-05-17'), autoRenewal: false, owner: 'Balasubramanian P', criticality: 'High', renewalPeriod: 1, remarks: 'Renewed & Moved Domain to CloudFlare' },
    { srNo: 6, serviceName: 'spa.com', category: 'Domain', vendor: 'CloudFlare', expiryDate: new Date('2026-06-18'), autoRenewal: false, owner: 'Balasubramanian P', criticality: 'Low' },
    { srNo: 7, serviceName: 'pana.com', category: 'Domain', vendor: 'CloudFlare', expiryDate: new Date('2026-06-18'), autoRenewal: false, owner: 'Balasubramanian P', criticality: 'Low' },
    { srNo: 8, serviceName: 'nationalinfrabuild.com', category: 'Domain', expiryDate: new Date('2030-11-01'), autoRenewal: false, owner: 'Balasubramanian P', criticality: 'High' },
    { srNo: 9, serviceName: 'Tacitine FireWall', category: 'AMC', vendor: 'Tacitine', autoRenewal: false, owner: 'Balasubramanian P', criticality: 'High' },
    { srNo: 10, serviceName: 'Microsoft 365 Mail (Reinland)', category: 'Microsoft365', billingCompany: 'Reinland', vendor: 'PaceInfo', autoRenewal: false, owner: 'Balasubramanian P', criticality: 'High' },
    { srNo: 11, serviceName: 'Microsoft 365 Mail (National Consulting)', category: 'Microsoft365', billingCompany: 'National Consulting', vendor: 'PaceInfo', autoRenewal: false, owner: 'Balasubramanian P', criticality: 'High' },
    { srNo: 12, serviceName: 'Microsoft Business App (Word, Excel, PPT)', category: 'Microsoft365', vendor: 'PaceInfo', autoRenewal: false, owner: 'Balasubramanian P', criticality: 'High' },
    { srNo: 13, serviceName: 'Sophos XDR', category: 'Antivirus', vendor: 'Rochana', expiryDate: new Date('2026-06-04'), autoRenewal: false, owner: 'Balasubramanian P', criticality: 'High', lastRenewalDate: new Date('2026-04-28'), annualCost: 129431, remarks: 'Anti Virus Software' },
  ];

  for (const entry of entries) {
    await prisma.entry.create({ data: entry });
  }

  console.log('Seeded: admin / Admin@123 + 13 entries');
}

seed()
  .catch(e => { console.error('Seed error:', e.message); })
  .finally(() => prisma.\$disconnect());
"

echo "Seeding Rainland hardware data if needed..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedHW() {
  if (await prisma.employee.count() > 0) { console.log('HW data present, skipping.'); return; }

  const emps = [
    {empId:'EMP0001',name:'Bharath',email:'bharath@rainland.co',department:'Chickmagalur',status:'Active'},
    {empId:'EMP0002',name:'Ankitha',email:'ankitha@rainland.co',department:'Ankola',status:'Active'},
    {empId:'EMP0003',name:'Nischitha',email:'nischitha@rainland.co',department:'Hassan',status:'Active'},
    {empId:'EMP0004',name:'Service Center',email:'svc.shivmoga@rainland.co',department:'Rainland-Shivmoga',status:'Active'},
    {empId:'EMP0005',name:'Manasa',email:'manasa@rainland.co',department:'Rainland-Shivmoga',status:'Active'},
    {empId:'EMP0006',name:'Ashwini',email:'ashwini@rainland.co',department:'Rainland-Shivmoga',status:'Active'},
    {empId:'EMP0007',name:'Isuzu',email:'isuzu@rainland.co',department:'Rainland-Shivmoga',status:'Active'},
    {empId:'EMP0008',name:'Jason',email:'jason@rainland.co',department:'Rainland-Shivmoga',status:'Active'},
    {empId:'EMP0009',name:'Yashwanth',email:'yashwanth@rainland.co',department:'Rainland-Shivmoga',status:'Active'},
    {empId:'EMP0010',name:'Servies Montra',email:'servies.montra@rainland.co',department:'Rainland-Shivmoga',status:'Active'},
    {empId:'EMP0011',name:'Pushpa',email:'pushpa@rainland.co',department:'Rainland-Shivmoga',status:'Active'},
    {empId:'EMP0012',name:'Syed Chaman',email:'syed.chaman@rainland.co',department:'Rainland-Shivmoga',status:'Active'},
    {empId:'EMP0013',name:'Shambrin A',email:'shambrin@rainland.co',department:'Rainland-Shivmoga',status:'Active'},
    {empId:'EMP0014',name:'Nethravathi',email:'nethravathi@rainland.co',department:'Rainland-Shivmoga',status:'Active'},
    {empId:'EMP0015',name:'Aressh',email:'aressh@rainland.co',department:'Rainland-Shivmoga',status:'Active'},
    {empId:'EMP0016',name:'Arun',email:'arun@rainland.co',department:'Rainland-Mangaluru',status:'Active'},
    {empId:'EMP0017',name:'Ashok',email:'ashok.blr@rainland.co',department:'Rainland-Bangalore',status:'Active'},
    {empId:'EMP0018',name:'Kalmath',email:'kalmath@rainland.co',department:'Rainland-Shivmoga',status:'Active'},
    {empId:'EMP0019',name:'Nayana',email:'nayana@rainland.co',department:'Rainland-Bangalore',status:'Active'},
    {empId:'EMP0020',name:'Service Bangalore',email:'svc.blr@rainland.co',department:'Rainland-Bangalore',status:'Active'},
    {empId:'EMP0021',name:'Front Desk',email:'frontdesk.blr@rainland.co',department:'Rainland-Bangalore',status:'Active'},
  ];
  const ids = {};
  for (const e of emps) { const r = await prisma.employee.create({data:e}); ids[e.name]=r.id; }

  const assets = [
    {srNo:14,serviceName:'ACER Desktop',category:'Desktop',vendor:'ACER',location:'Chickmagalur',assetTag:'NAT-CKM-001',assetStatus:'InUse',condition:'Good',remarks:'OS: WIN 10 | Intel Pentium/4GB | Win: Unlicensed',_e:'Bharath'},
    {srNo:15,serviceName:'DELL Desktop',category:'Desktop',vendor:'DELL',location:'Ankola',assetTag:'NAT-ANK-001',assetStatus:'InUse',condition:'Good',remarks:'OS: WIN 10 | Intel Pentium/4GB | Win: Unlicensed',_e:'Ankitha'},
    {srNo:16,serviceName:'Assembled Desktop',category:'Desktop',vendor:'Assembled',location:'Hassan',assetTag:'NAT-HAS-001',assetStatus:'InUse',condition:'Good',remarks:'OS: WIN 10 | Win: Unlicensed',_e:'Nischitha'},
    {srNo:17,serviceName:'HP Workstation Desktop',category:'Desktop',vendor:'HP',location:'Rainland-Mangaluru',assetTag:'NAT-MNG-001',assetStatus:'InUse',condition:'Good',remarks:'OS: WIN 11 | I7/16GB/512GB | Win: Original',_e:null},
    {srNo:18,serviceName:'Assembled Desktop',category:'Desktop',vendor:'Assembled',location:'Rainland-Mangaluru',assetTag:'NAT-MNG-002',assetStatus:'InUse',condition:'Good',remarks:'OS: WIN 11 | I3/8GB | Win: Unlicensed',_e:null},
    {srNo:19,serviceName:'Assembled Desktop',category:'Desktop',vendor:'Assembled',location:'Rainland-Mangaluru',assetTag:'NAT-MNG-003',assetStatus:'InUse',condition:'Good',remarks:'OS: WIN 11 | I3/8GB | Win: Unlicensed',_e:null},
    {srNo:20,serviceName:'Assembled Desktop',category:'Desktop',vendor:'Assembled',location:'Rainland-Mangaluru',assetTag:'NAT-MNG-004',assetStatus:'InUse',condition:'Good',remarks:'OS: WIN 11 | I3/8GB | Win: Unlicensed',_e:null},
    {srNo:21,serviceName:'Assembled Desktop',category:'Desktop',vendor:'Assembled',location:'Rainland-Mangaluru',assetTag:'NAT-MNG-005',assetStatus:'InUse',condition:'Good',remarks:'OS: WIN 11 | I3/8GB | Win: Unlicensed',_e:null},
    {srNo:22,serviceName:'Assembled Desktop',category:'Desktop',vendor:'Assembled',location:'Rainland-Mangaluru',assetTag:'NAT-MNG-006',assetStatus:'InUse',condition:'Good',remarks:'OS: WIN 11 | I3/8GB | Win: Unlicensed',_e:null},
    {srNo:23,serviceName:'Other Laptop',category:'Laptop',vendor:'Other',location:'Rainland-Shivmoga',assetTag:'NAT-SHV-001',assetStatus:'InUse',condition:'Good',remarks:'OS: WIN 11 | I3/16GB/512GB | Win: Original',_e:'Service Center'},
    {srNo:24,serviceName:'Laptop',category:'Laptop',vendor:null,location:'Rainland-Shivmoga',assetTag:'NAT-SHV-002',assetStatus:'InUse',condition:'Good',remarks:'OS: WIN 11 | I3/16GB/512GB | Win: Original',_e:'Service Center'},
    {srNo:25,serviceName:'Desktop',category:'Desktop',vendor:null,location:'Rainland-Shivmoga',assetTag:'NAT-SHV-003',assetStatus:'Available',condition:'Good',remarks:'OS: WIN 10 | Intel Pentium/4GB | Win: Unlicensed',_e:null},
    {srNo:26,serviceName:'MSI Desktop',category:'Desktop',vendor:'MSI',location:'Rainland-Shivmoga',assetTag:'NAT-SHV-004',assetStatus:'InUse',condition:'Good',remarks:'OS: WIN 11 | I5/16GB/512GB | Win: Original',_e:'Manasa'},
    {srNo:27,serviceName:'MSI Desktop',category:'Desktop',vendor:'MSI',location:'Rainland-Shivmoga',assetTag:'NAT-SHV-005',assetStatus:'Available',condition:'Good',remarks:'OS: WIN 11 | I5/16GB/512GB | Win: Original',_e:null},
    {srNo:28,serviceName:'MSI Desktop',category:'Desktop',vendor:'MSI',location:'Rainland-Shivmoga',assetTag:'NAT-SHV-006',assetStatus:'InUse',condition:'Good',remarks:'OS: WIN 11 | I5/16GB/512GB | Win: Original',_e:'Ashwini'},
    {srNo:29,serviceName:'Desktop',category:'Desktop',vendor:null,location:'Rainland-Shivmoga',assetTag:'NAT-SHV-007',assetStatus:'InUse',condition:'Good',remarks:'OS: WIN 10 | Intel Pentium/4GB | Win: Unlicensed',_e:'Isuzu'},
    {srNo:30,serviceName:'LENOVO Laptop',category:'Laptop',vendor:'LENOVO',location:'Rainland-Shivmoga',assetTag:'NAT-SHV-008',assetStatus:'InUse',condition:'Good',remarks:'OS: WIN 11 | I5/8GB/512GB | Win: Original',_e:'Jason'},
    {srNo:31,serviceName:'LENOVO Desktop',category:'Desktop',vendor:'LENOVO',location:'Rainland-Shivmoga',assetTag:'NAT-SHV-009',assetStatus:'InUse',condition:'Good',remarks:'OS: WIN 11 | Win: Unlicensed',_e:'Yashwanth'},
    {srNo:32,serviceName:'LENOVO Laptop',category:'Laptop',vendor:'LENOVO',location:'Rainland-Shivmoga',assetTag:'NAT-SHV-010',assetStatus:'InUse',condition:'Good',remarks:'OS: WIN 11 | I3/8GB/512GB | Win: Original',_e:'Servies Montra'},
    {srNo:33,serviceName:'ACER Desktop',category:'Desktop',vendor:'ACER',location:'Rainland-Shivmoga',assetTag:'NAT-SHV-011',assetStatus:'InUse',condition:'Good',remarks:'OS: WIN 10 | Intel Pentium/4GB | Win: Unlicensed',_e:'Pushpa'},
    {srNo:34,serviceName:'ACER Desktop',category:'Desktop',vendor:'ACER',location:'Rainland-Shivmoga',assetTag:'NAT-SHV-012',assetStatus:'InUse',condition:'Good',remarks:'OS: WIN 10 | Intel Pentium/4GB | Win: Unlicensed',_e:'Syed Chaman'},
    {srNo:35,serviceName:'ACER Desktop',category:'Desktop',vendor:'ACER',location:'Rainland-Shivmoga',assetTag:'NAT-SHV-013',assetStatus:'InUse',condition:'Good',remarks:'OS: WIN 10 | Intel Pentium/4GB RAM | Win: Unlicensed',_e:'Syed Chaman'},
    {srNo:36,serviceName:'ACER Desktop',category:'Desktop',vendor:'ACER',location:'Rainland-Shivmoga',assetTag:'NAT-SHV-014',assetStatus:'InUse',condition:'Good',remarks:'OS: WIN 10 | Intel Pentium/4GB | Win: Unlicensed',_e:'Shambrin A'},
    {srNo:37,serviceName:'ACER Desktop',category:'Desktop',vendor:'ACER',location:'Rainland-Shivmoga',assetTag:'NAT-SHV-015',assetStatus:'InUse',condition:'Good',remarks:'OS: WIN 10 | Intel Pentium/4GB | Win: Unlicensed',_e:'Nethravathi'},
    {srNo:38,serviceName:'Zebronics Desktop',category:'Desktop',vendor:'Zebronics',location:'Rainland-Shivmoga',assetTag:'NAT-SHV-016',assetStatus:'Available',condition:'Good',remarks:'OS: WIN 10 | Intel Pentium/4GB | Win: Unlicensed',_e:null},
    {srNo:39,serviceName:'ACER Desktop',category:'Desktop',vendor:'ACER',location:'Rainland-Shivmoga',assetTag:'NAT-SHV-017',assetStatus:'Available',condition:'Good',remarks:'OS: WIN 10 | Intel Pentium/4GB RAM | Win: Unlicensed',_e:null},
    {srNo:40,serviceName:'LENOVO Laptop',category:'Laptop',vendor:'LENOVO',location:'Rainland-Shivmoga',assetTag:'NAT-SHV-018',assetStatus:'InUse',condition:'Good',remarks:'OS: WIN 11 | I5/16GB/512GB | Win: Original',_e:'Aressh'},
    {srNo:41,serviceName:'ACER Desktop',category:'Desktop',vendor:'ACER',location:'Rainland-Shivmoga',assetTag:'NAT-SHV-019',assetStatus:'Available',condition:'Good',remarks:'OS: WIN 10 | Intel Pentium/4GB RAM | Win: Unlicensed',_e:null},
    {srNo:42,serviceName:'ACER Desktop',category:'Desktop',vendor:'ACER',location:'Rainland-Shivmoga',assetTag:'NAT-SHV-020',assetStatus:'Available',condition:'Good',remarks:'OS: WIN 10 | Intel Pentium/4GB RAM | Win: Unlicensed',_e:null},
    {srNo:43,serviceName:'ACER Desktop',category:'Desktop',vendor:'ACER',location:'Rainland-Shivmoga',assetTag:'NAT-SHV-021',assetStatus:'Available',condition:'Good',remarks:'OS: WIN 10 | Intel Pentium/4GB RAM | Win: Unlicensed',_e:null},
    {srNo:44,serviceName:'LENOVO Laptop',category:'Laptop',vendor:'LENOVO',location:'Rainland-Mangaluru',assetTag:'NAT-MNG-007',assetStatus:'InUse',condition:'Good',remarks:'OS: WIN 11 | Win: Original',_e:'Arun'},
    {srNo:45,serviceName:'LENOVO Laptop',category:'Laptop',vendor:'LENOVO',location:'Rainland-Bangalore',assetTag:'NAT-BLR-001',assetStatus:'InUse',condition:'Good',remarks:'OS: WIN 11 | Win: Original',_e:'Ashok'},
    {srNo:46,serviceName:'LENOVO Laptop',category:'Laptop',vendor:'LENOVO',location:'Rainland-Shivmoga',assetTag:'NAT-SHV-022',assetStatus:'InUse',condition:'Good',remarks:'OS: WIN 11 | Win: Original',_e:'Kalmath'},
    {srNo:47,serviceName:'MSI Desktop',category:'Desktop',vendor:'MSI',location:'Rainland-Bangalore',assetTag:'NAT-BLR-002',assetStatus:'InUse',condition:'Good',remarks:'OS: WIN 11 | I5/16GB/512GB | Win: Original',_e:'Nayana'},
    {srNo:48,serviceName:'MSI Desktop',category:'Desktop',vendor:'MSI',location:'Rainland-Bangalore',assetTag:'NAT-BLR-003',assetStatus:'InUse',condition:'Good',remarks:'OS: WIN 11 | I5/16GB/512GB | Win: Original',_e:'Service Bangalore'},
    {srNo:49,serviceName:'MSI Desktop',category:'Desktop',vendor:'MSI',location:'Rainland-Bangalore',assetTag:'NAT-BLR-004',assetStatus:'InUse',condition:'Good',remarks:'OS: WIN 11 | I5/16GB/512GB | Win: Original',_e:'Front Desk'},
  ];

  const allocDate = new Date('2026-05-19');
  for (const a of assets) {
    const {_e,...d} = a;
    const entry = await prisma.entry.create({data:d});
    if (_e && ids[_e]) {
      await prisma.allocation.create({data:{assetId:entry.id,employeeId:ids[_e],allocatedAt:allocDate,status:'Active'}});
    }
  }
  console.log('Seeded: 21 employees + 36 Rainland assets + allocations');
}
seedHW()
  .catch(e => { console.error('HW seed error:', e.message); })
  .finally(() => prisma.\$disconnect());
"

echo "Starting API server..."
exec node dist/index.js
