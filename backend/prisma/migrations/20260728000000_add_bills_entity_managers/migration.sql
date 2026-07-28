-- CreateTable
CREATE TABLE "Bill" (
    "id" SERIAL NOT NULL,
    "vendorName" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "amount" DOUBLE PRECISION NOT NULL,
    "entity" TEXT NOT NULL,
    "paymentMethod" TEXT,
    "submittedBy" TEXT NOT NULL,
    "submitterEmail" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Submitted',
    "remarks" TEXT,
    "rejectionReason" TEXT,
    "paidAt" TIMESTAMP(3),
    "paidBy" TEXT,
    "transactionRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillAttachment" (
    "id" SERIAL NOT NULL,
    "billId" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "filesize" INTEGER,
    "mimetype" TEXT,
    "data" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityManager" (
    "id" SERIAL NOT NULL,
    "entityName" TEXT NOT NULL,
    "managerName" TEXT NOT NULL,
    "managerEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntityManager_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EntityManager_entityName_key" ON "EntityManager"("entityName");

-- AddForeignKey
ALTER TABLE "BillAttachment" ADD CONSTRAINT "BillAttachment_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
