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

echo "Seeding National Group HO hardware data if needed..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedHO() {
  if (await prisma.employee.findFirst({ where: { empId: 'HO-001' } })) {
    console.log('HO data already present, skipping.');
    return;
  }

  const emps = [
    {empId:'HO-001',name:'Real Estate Dept',email:'realestate.dept@nationalgroupindia.com',department:'REAL ESTATE',status:'Active'},
    {empId:'HO-002',name:'Shruthi D',email:'shruthi.d@nationalgroupindia.com',department:'HO-HR',status:'Active'},
    {empId:'HO-003',name:'Armaan',email:'armaan@nationalgroupindia.com',department:'SOFTWARE DEVOPS',status:'Active'},
    {empId:'HO-004',name:'Suresh N',email:'suresh.n@nationalgroupindia.com',department:'HO-NIPL',status:'Active'},
    {empId:'HO-005',name:'Babu Puttanna',email:'babu.puttanna@nationalgroupindia.com',department:'HO-LEGAL',status:'Active'},
    {empId:'HO-006',name:'Jegan',email:'jegan@nationalgroupindia.com',department:'HO-IT INFRA',status:'Active'},
    {empId:'HO-007',name:'Deepti',email:'deepti@nationalgroupindia.com',department:'HO-NCPL',status:'Active'},
    {empId:'HO-008',name:'Gupta',email:'gupta@nationalgroupindia.com',department:'ISKY',status:'Active'},
    {empId:'HO-009',name:'Lincy Chandra',email:'lincy.chandra@nationalgroupindia.com',department:'REAL ESTATE',status:'Active'},
    {empId:'HO-010',name:'Madan M',email:'madan.m@nationalgroupindia.com',department:'REAL ESTATE',status:'Active'},
    {empId:'HO-011',name:'Abhiram',email:'abhiram@nationalgroupindia.com',department:'HO MARKETING',status:'Active'},
    {empId:'HO-012',name:'Harsdeep',email:'harsdeep@nationalgroupindia.com',department:'HO MARKETING',status:'Active'},
    {empId:'HO-013',name:'Deepanshi',email:'deepanshi@nationalgroupindia.com',department:'SOFTWARE DEVOPS',status:'Active'},
    {empId:'HO-014',name:'Aadityaa',email:'aadityaa@nationalgroupindia.com',department:'SOFTWARE DEVOPS',status:'Active'},
    {empId:'HO-015',name:'Yahya',email:'yahya@nationalgroupindia.com',department:'SOFTWARE DEVOPS',status:'Active'},
    {empId:'HO-016',name:'Sanjay',email:'sanjay@nationalgroupindia.com',department:'ISKY',status:'Active'},
    {empId:'HO-017',name:'Munavar',email:'munavar@nationalgroupindia.com',department:'HO-BD',status:'Active'},
    {empId:'HO-018',name:'ESSL',email:'essl@nationalgroupindia.com',department:'HO-IT INFRA',status:'Active'},
    {empId:'HO-019',name:'Atique',email:'atique@nationalgroupindia.com',department:'HO-FINANCE',status:'Active'},
    {empId:'HO-020',name:'Prasanna H',email:'prasanna.h@nationalgroupindia.com',department:'HO-FINANCE',status:'Active'},
    {empId:'HO-021',name:'Jaykrishnan',email:'jaykrishnan@nationalgroupindia.com',department:'HO-NCPL',status:'Active'},
    {empId:'HO-022',name:'Nirup',email:'nirup@nationalgroupindia.com',department:'REAL ESTATE',status:'Active'},
    {empId:'HO-023',name:'Anil',email:'anil@nationalgroupindia.com',department:'HO-NIPL',status:'Active'},
    {empId:'HO-024',name:'Manish',email:'manish@nationalgroupindia.com',department:'HO-NIPL',status:'Active'},
    {empId:'HO-025',name:'Mahesh',email:'mahesh@nationalgroupindia.com',department:'HO-NIPL',status:'Active'},
    {empId:'HO-026',name:'Siddharth',email:'siddharth@nationalgroupindia.com',department:'REAL ESTATE',status:'Active'},
    {empId:'HO-027',name:'Neehar',email:'neehar@nationalgroupindia.com',department:'REAL ESTATE',status:'Active'},
    {empId:'HO-028',name:'Intern 1',email:'intern1@nationalgroupindia.com',department:'HO-NCPL',status:'Active'},
    {empId:'HO-029',name:'Intern 2',email:'intern2@nationalgroupindia.com',department:'HO-NCPL',status:'Active'},
    {empId:'HO-030',name:'Shwetha',email:'shwetha@nationalgroupindia.com',department:'HO MARKETING',status:'Active'},
    {empId:'HO-031',name:'Siri',email:'siri@nationalgroupindia.com',department:'HO-NCPL',status:'Active'},
    {empId:'HO-032',name:'Balasubramanian',email:'balasubramanian@nationalgroupindia.com',department:'HO-IT INFRA',status:'Active'},
    {empId:'HO-033',name:'Salman',email:'salman@nationalgroupindia.com',department:'HO-NCPL',status:'Active'},
    {empId:'HO-034',name:'Farooq',email:'farooq@nationalgroupindia.com',department:'HO-NCPL',status:'Active'},
    {empId:'HO-035',name:'Rajeev',email:'rajeev@nationalgroupindia.com',department:'HO-HR',status:'Active'},
    {empId:'HO-036',name:'Meeting Room 4th',email:'meetingroom4th@nationalgroupindia.com',department:'HO-NCPL',status:'Active'},
    {empId:'HO-037',name:'Meeting Room 7th',email:'meetingroom7th@nationalgroupindia.com',department:'HO-NCPL',status:'Active'},
    {empId:'HO-038',name:'IT Infra',email:'itinfra@nationalgroupindia.com',department:'HO-NCPL',status:'Active'},
    {empId:'HO-039',name:'Kartik',email:'kartik@nationalgroupindia.com',department:'HO-FINANCE',status:'Active'},
    {empId:'HO-040',name:'Srikanath',email:'srikanath@nationalgroupindia.com',department:'HO-NCPL',status:'Active'},
  ];

  const ids = {};
  for (const e of emps) { const r = await prisma.employee.create({data:e}); ids[e.empId]=r.id; }

  const allocDate = new Date('2026-05-20');
  const returnDate = new Date('2026-05-01');

  const assets = [
    {srNo:50,serviceName:'MSI Laptop',category:'Laptop',vendor:'MSI',location:'BANGALORE-HO',assetTag:'NAT-HO-001',assetStatus:'InUse',condition:'Good',_e:'HO-001',_s:'Active'},
    {srNo:51,serviceName:'Lenovo Laptop',category:'Laptop',vendor:'Lenovo',location:'BANGALORE-HO',assetTag:'NAT-HO-002',assetStatus:'Available',condition:'Good',_e:'HO-002',_s:'Returned'},
    {srNo:52,serviceName:'Laptop',category:'Laptop',vendor:null,location:'BANGALORE-HO',assetTag:'NAT-HO-003',assetStatus:'InUse',condition:'Good',_e:'HO-003',_s:'Active'},
    {srNo:53,serviceName:'Lenovo Laptop',category:'Laptop',vendor:'Lenovo',location:'BANGALORE-HO',assetTag:'NAT-HO-004',assetStatus:'Available',condition:'Good',_e:'HO-004',_s:'Returned'},
    {srNo:54,serviceName:'Lenovo Laptop',category:'Laptop',vendor:'Lenovo',location:'BANGALORE-HO',assetTag:'NAT-HO-005',assetStatus:'InUse',condition:'Good',_e:'HO-005',_s:'Active'},
    {srNo:55,serviceName:'Lenovo Laptop',category:'Laptop',vendor:'Lenovo',location:'BANGALORE-HO',assetTag:'NAT-HO-006',assetStatus:'InUse',condition:'Good',_e:'HO-006',_s:'Active'},
    {srNo:56,serviceName:'Laptop',category:'Laptop',vendor:null,location:'BANGALORE-HO',assetTag:'NAT-HO-007',assetStatus:'Available',condition:'Good',_e:null,_s:null},
    {srNo:57,serviceName:'Microsoft Surface Pro 11',category:'Laptop',vendor:'Microsoft',location:'BANGALORE-HO',assetTag:'NAT-HO-008',assetStatus:'Available',condition:'Good',_e:'HO-008',_s:'Returned'},
    {srNo:58,serviceName:'MSI Laptop',category:'Laptop',vendor:'MSI',location:'BANGALORE-HO',assetTag:'NAT-HO-009',assetStatus:'InUse',condition:'Good',_e:'HO-009',_s:'Active'},
    {srNo:59,serviceName:'MSI Laptop',category:'Laptop',vendor:'MSI',location:'BANGALORE-HO',assetTag:'NAT-HO-010',assetStatus:'Available',condition:'Good',_e:'HO-010',_s:'Returned'},
    {srNo:60,serviceName:'Apple MacBook',category:'Laptop',vendor:'Apple',location:'BANGALORE-HO',assetTag:'NAT-HO-011',assetStatus:'Available',condition:'Good',_e:'HO-011',_s:'Returned'},
    {srNo:61,serviceName:'Lenovo Laptop',category:'Laptop',vendor:'Lenovo',location:'BANGALORE-HO',assetTag:'NAT-HO-012',assetStatus:'InUse',condition:'Good',_e:'HO-012',_s:'Active'},
    {srNo:62,serviceName:'Apple MacBook',category:'Laptop',vendor:'Apple',location:'BANGALORE-HO',assetTag:'NAT-HO-013',assetStatus:'InUse',condition:'Good',invoiceRef:'GSI/2526/905',purchaseDate:new Date('2025-07-15'),_e:'HO-013',_s:'Active'},
    {srNo:63,serviceName:'Apple MacBook Pro',category:'Laptop',vendor:'Apple',location:'BANGALORE-HO',assetTag:'NAT-HO-014',assetStatus:'InUse',condition:'Good',invoiceRef:'ITZ2501223',purchaseDate:new Date('2025-05-09'),_e:'HO-014',_s:'Active'},
    {srNo:64,serviceName:'Apple MacBook',category:'Laptop',vendor:'Apple',location:'BANGALORE-HO',assetTag:'NAT-HO-015',assetStatus:'InUse',condition:'Good',_e:'HO-015',_s:'Active'},
    {srNo:65,serviceName:'Lenovo Laptop',category:'Laptop',vendor:'Lenovo',location:'BANGALORE-HO',assetTag:'NAT-HO-016',assetStatus:'InUse',condition:'Good',_e:'HO-016',_s:'Active'},
    {srNo:66,serviceName:'Lenovo Laptop',category:'Laptop',vendor:'Lenovo',location:'BANGALORE-HO',assetTag:'NAT-HO-017',assetStatus:'Available',condition:'Good',_e:'HO-017',_s:'Returned'},
    {srNo:67,serviceName:'Desktop',category:'Desktop',vendor:null,location:'BANGALORE-HO',assetTag:'NAT-HO-018',assetStatus:'InUse',condition:'Good',_e:'HO-018',_s:'Active'},
    {srNo:68,serviceName:'Lenovo Laptop',category:'Laptop',vendor:'Lenovo',location:'BANGALORE-HO',assetTag:'NAT-HO-019',assetStatus:'InUse',condition:'Good',_e:'HO-019',_s:'Active'},
    {srNo:69,serviceName:'Lenovo Laptop',category:'Laptop',vendor:'Lenovo',location:'BANGALORE-HO',assetTag:'NAT-HO-020',assetStatus:'InUse',condition:'Good',_e:'HO-020',_s:'Active'},
    {srNo:70,serviceName:'Microsoft Surface Pro 11',category:'Laptop',vendor:'Microsoft',location:'BANGALORE-HO',assetTag:'NAT-HO-021',assetStatus:'InUse',condition:'Good',_e:'HO-021',_s:'Active'},
    {srNo:71,serviceName:'Microsoft Surface Pro 11',category:'Laptop',vendor:'Microsoft',location:'BANGALORE-HO',assetTag:'NAT-HO-022',assetStatus:'InUse',condition:'Good',_e:'HO-022',_s:'Active'},
    {srNo:72,serviceName:'Lenovo Laptop',category:'Laptop',vendor:'Lenovo',location:'BANGALORE-HO',assetTag:'NAT-HO-023',assetStatus:'InUse',condition:'Good',_e:'HO-023',_s:'Active'},
    {srNo:73,serviceName:'Lenovo Laptop',category:'Laptop',vendor:'Lenovo',location:'BANGALORE-HO',assetTag:'NAT-HO-024',assetStatus:'InUse',condition:'Good',_e:'HO-024',_s:'Active'},
    {srNo:74,serviceName:'Lenovo Laptop',category:'Laptop',vendor:'Lenovo',location:'BANGALORE-HO',assetTag:'NAT-HO-025',assetStatus:'InUse',condition:'Good',_e:'HO-025',_s:'Active'},
    {srNo:75,serviceName:'Desktop',category:'Desktop',vendor:null,location:'BANGALORE-HO',assetTag:'NAT-HO-026',assetStatus:'InUse',condition:'Good',_e:'HO-026',_s:'Active'},
    {srNo:76,serviceName:'Desktop',category:'Desktop',vendor:null,location:'BANGALORE-HO',assetTag:'NAT-HO-027',assetStatus:'InUse',condition:'Good',invoiceRef:'GSI/2526/922',purchaseDate:new Date('2025-07-17'),_e:'HO-027',_s:'Active'},
    {srNo:77,serviceName:'Desktop',category:'Desktop',vendor:null,location:'BANGALORE-HO',assetTag:'NAT-HO-028',assetStatus:'InUse',condition:'Good',_e:'HO-028',_s:'Active'},
    {srNo:78,serviceName:'Desktop',category:'Desktop',vendor:null,location:'BANGALORE-HO',assetTag:'NAT-HO-029',assetStatus:'InUse',condition:'Good',_e:'HO-029',_s:'Active'},
    {srNo:79,serviceName:'Lenovo Desktop',category:'Desktop',vendor:'Lenovo',location:'BANGALORE-HO',assetTag:'NAT-HO-030',assetStatus:'InUse',condition:'Good',_e:'HO-030',_s:'Active'},
    {srNo:80,serviceName:'Lenovo Laptop',category:'Laptop',vendor:'Lenovo',location:'BANGALORE-HO',assetTag:'NAT-HO-031',assetStatus:'InUse',condition:'Good',_e:'HO-031',_s:'Active'},
    {srNo:81,serviceName:'Lenovo Laptop',category:'Laptop',vendor:'Lenovo',location:'BANGALORE-HO',assetTag:'NAT-HO-032',assetStatus:'InUse',condition:'Good',_e:'HO-032',_s:'Active'},
    {srNo:82,serviceName:'Lenovo Laptop',category:'Laptop',vendor:'Lenovo',location:'BANGALORE-HO',assetTag:'NAT-HO-033',assetStatus:'InUse',condition:'Good',_e:'HO-033',_s:'Active'},
    {srNo:83,serviceName:'Apple MacBook',category:'Laptop',vendor:'Apple',location:'BANGALORE-HO',assetTag:'NAT-HO-034',assetStatus:'Available',condition:'Good',_e:'HO-034',_s:'Returned'},
    {srNo:84,serviceName:'Lenovo Laptop',category:'Laptop',vendor:'Lenovo',location:'BANGALORE-HO',assetTag:'NAT-HO-035',assetStatus:'Available',condition:'Good',_e:'HO-035',_s:'Returned'},
    {srNo:85,serviceName:'Apple Mac Mini',category:'Desktop',vendor:'Apple',location:'BANGALORE-HO',assetTag:'NAT-HO-036',assetStatus:'InUse',condition:'Good',_e:'HO-036',_s:'Active'},
    {srNo:86,serviceName:'Apple Mac Mini',category:'Desktop',vendor:'Apple',location:'BANGALORE-HO',assetTag:'NAT-HO-037',assetStatus:'InUse',condition:'Good',_e:'HO-037',_s:'Active'},
    {srNo:87,serviceName:'Apple Mac Mini',category:'Desktop',vendor:'Apple',location:'BANGALORE-HO',assetTag:'NAT-HO-038',assetStatus:'InUse',condition:'Good',_e:'HO-038',_s:'Active'},
    {srNo:88,serviceName:'Lenovo Laptop',category:'Laptop',vendor:'Lenovo',location:'BANGALORE-HO',assetTag:'NAT-HO-039',assetStatus:'InUse',condition:'Good',_e:'HO-039',_s:'Active'},
    {srNo:89,serviceName:'Lenovo Laptop',category:'Laptop',vendor:'Lenovo',location:'BANGALORE-HO',assetTag:'NAT-HO-040',assetStatus:'InUse',condition:'Good',_e:'HO-040',_s:'Active'},
  ];

  for (const a of assets) {
    const {_e, _s, ...d} = a;
    const entry = await prisma.entry.create({data:d});
    if (_e && _s) {
      await prisma.allocation.create({
        data:{
          assetId:entry.id,
          employeeId:ids[_e],
          allocatedAt:allocDate,
          status:_s,
          returnedAt:_s === 'Returned' ? returnDate : null
        }
      });
    }
  }
  console.log('Seeded: 40 NGI HO employees + 40 assets + allocations');
}

seedHO()
  .catch(e => { console.error('HO seed error:', e.message); })
  .finally(() => prisma.\$disconnect());
"

echo "Seeding IT project tasks if needed..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedTasks() {
  if (await prisma.task.count() > 0) { console.log('Tasks present, skipping.'); return; }

  const tasks = [
    {id:1,  taskName:'Project Kickoff & Planning',           location:'All Locations',  startDate:new Date('2026-05-25'), endDate:new Date('2026-05-28'), duration:4,  dependencyIds:null,   status:'Planned', priority:'High'},
    {id:2,  taskName:'Budget Approval & Advance Request',    location:'All Locations',  startDate:new Date('2026-05-29'), endDate:new Date('2026-06-01'), duration:4,  dependencyIds:'1',    status:'Planned', priority:'High'},
    {id:3,  taskName:'Vendor Finalization',                  location:'All Locations',  startDate:new Date('2026-06-02'), endDate:new Date('2026-06-05'), duration:4,  dependencyIds:'2',    status:'Planned', priority:'Medium'},
    {id:4,  taskName:'Advance Payment Release',              location:'All Locations',  startDate:new Date('2026-06-06'), endDate:new Date('2026-06-08'), duration:3,  dependencyIds:'3',    status:'Planned', priority:'High'},
    {id:5,  taskName:'License Procurement',                  location:'All Locations',  startDate:new Date('2026-06-06'), endDate:new Date('2026-06-10'), duration:5,  dependencyIds:'4',    status:'Planned', priority:'Medium'},
    {id:6,  taskName:'CCTV Material Procurement',           location:'All Locations',  startDate:new Date('2026-07-07'), endDate:new Date('2026-06-15'), duration:9,  dependencyIds:'4',    status:'Planned', priority:'Medium'},
    {id:7,  taskName:'System Inventory & Audit',             location:'Mangaluru',      startDate:new Date('2026-05-29'), endDate:new Date('2026-06-03'), duration:6,  dependencyIds:'1',    status:'Planned', priority:'Medium'},
    {id:8,  taskName:'Windows Installation',                 location:'Mangaluru',      startDate:new Date('2026-06-04'), endDate:new Date('2026-06-10'), duration:7,  dependencyIds:'5,7',  status:'Planned', priority:'Medium'},
    {id:9,  taskName:'Microsoft Desktop Apps Installation', location:'Mangaluru',      startDate:new Date('2026-06-11'), endDate:new Date('2026-06-14'), duration:4,  dependencyIds:'8',    status:'Planned', priority:'Medium'},
    {id:10, taskName:'Compliance Audit',                    location:'Mangaluru',      startDate:new Date('2026-06-15'), endDate:new Date('2026-06-18'), duration:4,  dependencyIds:'9',    status:'Planned', priority:'High'},
    {id:11, taskName:'CCTV Site Survey',                    location:'Mangaluru',      startDate:new Date('2026-06-19'), endDate:new Date('2026-06-22'), duration:4,  dependencyIds:'10',   status:'Planned', priority:'Medium'},
    {id:12, taskName:'CCTV Planning & BOQ',                 location:'Mangaluru',      startDate:new Date('2026-06-23'), endDate:new Date('2026-06-27'), duration:5,  dependencyIds:'11',   status:'Planned', priority:'Medium'},
    {id:13, taskName:'CCTV Implementation',                 location:'Mangaluru',      startDate:new Date('2026-06-28'), endDate:new Date('2026-07-08'), duration:11, dependencyIds:'6,12', status:'Planned', priority:'High'},
    {id:14, taskName:'Interim Vendor Payment',              location:'Mangaluru',      startDate:new Date('2026-07-02'), endDate:new Date('2026-07-03'), duration:2,  dependencyIds:'13',   status:'Planned', priority:'Medium'},
    {id:15, taskName:'System Inventory & Audit',            location:'Shivamogga',     startDate:new Date('2026-06-02'), endDate:new Date('2026-06-06'), duration:5,  dependencyIds:'1',    status:'Planned', priority:'Medium'},
    {id:16, taskName:'Windows Installation',                location:'Shivamogga',     startDate:new Date('2026-06-07'), endDate:new Date('2026-06-13'), duration:7,  dependencyIds:'5,15', status:'Planned', priority:'Medium'},
    {id:17, taskName:'Microsoft Desktop Apps Installation',location:'Shivamogga',     startDate:new Date('2026-06-14'), endDate:new Date('2026-06-17'), duration:4,  dependencyIds:'16',   status:'Planned', priority:'Medium'},
    {id:18, taskName:'Compliance Audit',                    location:'Shivamogga',     startDate:new Date('2026-06-18'), endDate:new Date('2026-06-21'), duration:4,  dependencyIds:'17',   status:'Planned', priority:'High'},
    {id:19, taskName:'CCTV Site Survey',                    location:'Shivamogga',     startDate:new Date('2026-06-22'), endDate:new Date('2026-06-25'), duration:4,  dependencyIds:'18',   status:'Planned', priority:'Medium'},
    {id:20, taskName:'CCTV Planning & BOQ',                 location:'Shivamogga',     startDate:new Date('2026-06-26'), endDate:new Date('2026-06-30'), duration:5,  dependencyIds:'19',   status:'Planned', priority:'Medium'},
    {id:21, taskName:'CCTV Implementation',                 location:'Shivamogga',     startDate:new Date('2026-07-01'), endDate:new Date('2026-07-10'), duration:10, dependencyIds:'6,20', status:'Planned', priority:'High'},
    {id:22, taskName:'Interim Vendor Payment',              location:'Shivamogga',     startDate:new Date('2026-07-04'), endDate:new Date('2026-07-05'), duration:2,  dependencyIds:'21',   status:'Planned', priority:'Medium'},
    {id:23, taskName:'System Inventory & Audit',            location:'Hassan',         startDate:new Date('2026-06-05'), endDate:new Date('2026-06-09'), duration:5,  dependencyIds:'1',    status:'Planned', priority:'Medium'},
    {id:24, taskName:'Windows Installation',                location:'Hassan',         startDate:new Date('2026-06-10'), endDate:new Date('2026-06-16'), duration:7,  dependencyIds:'5,23', status:'Planned', priority:'Medium'},
    {id:25, taskName:'Microsoft Desktop Apps Installation',location:'Hassan',         startDate:new Date('2026-06-17'), endDate:new Date('2026-06-20'), duration:4,  dependencyIds:'24',   status:'Planned', priority:'Medium'},
    {id:26, taskName:'Compliance Audit',                    location:'Hassan',         startDate:new Date('2026-06-21'), endDate:new Date('2026-06-24'), duration:4,  dependencyIds:'25',   status:'Planned', priority:'High'},
    {id:27, taskName:'CCTV Site Survey',                    location:'Hassan',         startDate:new Date('2026-06-25'), endDate:new Date('2026-06-28'), duration:4,  dependencyIds:'26',   status:'Planned', priority:'Medium'},
    {id:28, taskName:'CCTV Planning & BOQ',                 location:'Hassan',         startDate:new Date('2026-06-29'), endDate:new Date('2026-07-03'), duration:5,  dependencyIds:'27',   status:'Planned', priority:'Medium'},
    {id:29, taskName:'CCTV Implementation',                 location:'Hassan',         startDate:new Date('2026-07-04'), endDate:new Date('2026-07-14'), duration:11, dependencyIds:'6,28', status:'Planned', priority:'High'},
    {id:30, taskName:'Interim Vendor Payment',              location:'Hassan',         startDate:new Date('2026-07-08'), endDate:new Date('2026-07-09'), duration:2,  dependencyIds:'29',   status:'Planned', priority:'Medium'},
    {id:31, taskName:'System Inventory & Audit',            location:'Chikkamagaluru', startDate:new Date('2026-06-08'), endDate:new Date('2026-06-12'), duration:5,  dependencyIds:'1',    status:'Planned', priority:'Medium'},
    {id:32, taskName:'Windows Installation',                location:'Chikkamagaluru', startDate:new Date('2026-06-13'), endDate:new Date('2026-06-19'), duration:7,  dependencyIds:'5,31', status:'Planned', priority:'Medium'},
    {id:33, taskName:'Microsoft Desktop Apps Installation',location:'Chikkamagaluru', startDate:new Date('2026-06-20'), endDate:new Date('2026-06-23'), duration:4,  dependencyIds:'32',   status:'Planned', priority:'Medium'},
    {id:34, taskName:'Compliance Audit',                    location:'Chikkamagaluru', startDate:new Date('2026-06-24'), endDate:new Date('2026-06-27'), duration:4,  dependencyIds:'33',   status:'Planned', priority:'High'},
    {id:35, taskName:'CCTV Site Survey',                    location:'Chikkamagaluru', startDate:new Date('2026-06-28'), endDate:new Date('2026-07-01'), duration:4,  dependencyIds:'34',   status:'Planned', priority:'Medium'},
    {id:36, taskName:'CCTV Planning & BOQ',                 location:'Chikkamagaluru', startDate:new Date('2026-07-02'), endDate:new Date('2026-07-06'), duration:5,  dependencyIds:'35',   status:'Planned', priority:'Medium'},
    {id:37, taskName:'CCTV Implementation',                 location:'Chikkamagaluru', startDate:new Date('2026-07-07'), endDate:new Date('2026-07-17'), duration:11, dependencyIds:'6,36', status:'Planned', priority:'High'},
    {id:38, taskName:'Interim Vendor Payment',              location:'Chikkamagaluru', startDate:new Date('2026-07-10'), endDate:new Date('2026-07-11'), duration:2,  dependencyIds:'37',   status:'Planned', priority:'Medium'},
    {id:39, taskName:'Final Audit & Testing',               location:'All Locations',  startDate:new Date('2026-07-18'), endDate:new Date('2026-07-20'), duration:3,  dependencyIds:'13,21,29,37', status:'Planned', priority:'High'},
    {id:40, taskName:'Final Vendor Payment & Closure',      location:'All Locations',  startDate:new Date('2026-07-21'), endDate:new Date('2026-07-22'), duration:2,  dependencyIds:'39',   status:'Planned', priority:'High'},
  ];

  for (const {id: _id, duration: _d, ...t} of tasks) {
    await prisma.task.create({ data: { ...t, projectName: 'NGI IT Infrastructure & CCTV Project 2026' } });
  }
  console.log('Seeded: 40 IT project tasks');
}

seedTasks()
  .catch(e => { console.error('Tasks seed error:', e.message); })
  .finally(() => prisma.\$disconnect());
"

echo "Starting API server..."
exec node dist/index.js
