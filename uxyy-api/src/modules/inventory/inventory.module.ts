import { Module } from '@nestjs/common';
import { ProductsController } from './controllers/products.controller';
import { SuppliersController } from './controllers/suppliers.controller';
import { SalesOrdersController } from './controllers/sales-orders.controller';
import { PurchaseOrdersController } from './controllers/purchase-orders.controller';
import { InventoryController } from './controllers/inventory.controller';
import { StocktakingController } from './controllers/stocktaking.controller';
import { PaymentRecordController } from './controllers/payment-record.controller';
import { BatchController } from './controllers/batch.controller';
import { BarcodeController } from './controllers/barcode.controller';
import { PurchaseSuggestionController } from './controllers/purchase-suggestion.controller';
import { WarehouseController } from './controllers/warehouse.controller';
import { MemberPriceController } from './controllers/member-price.controller';
import { ProductsService } from './services/products.service';
import { SuppliersService } from './services/suppliers.service';
import { SalesOrdersService } from './services/sales-orders.service';
import { PurchaseOrdersService } from './services/purchase-orders.service';
import { InventoryService } from './services/inventory.service';
import { StocktakingService } from './services/stocktaking.service';
import { PaymentRecordService } from './services/payment-record.service';
import { AutoAccountingService } from '../finance/services/auto-accounting.service';
import { BatchService } from './services/batch.service';
import { BarcodeService } from './services/barcode.service';
import { PurchaseSuggestionService } from './services/purchase-suggestion.service';
import { WarehouseService } from './services/warehouse.service';
import { MemberPriceService } from './services/member-price.service';

@Module({
  controllers: [
    ProductsController,
    SuppliersController,
    SalesOrdersController,
    PurchaseOrdersController,
    InventoryController,
    StocktakingController,
    PaymentRecordController,
    BatchController,
    BarcodeController,
    PurchaseSuggestionController,
    WarehouseController,
    MemberPriceController,
  ],
  providers: [
    ProductsService,
    SuppliersService,
    SalesOrdersService,
    PurchaseOrdersService,
    InventoryService,
    StocktakingService,
    PaymentRecordService,
    AutoAccountingService,
    BatchService,
    BarcodeService,
    PurchaseSuggestionService,
    WarehouseService,
    MemberPriceService,
  ],
  exports: [
    BatchService,
    BarcodeService,
    PurchaseSuggestionService,
    WarehouseService,
    MemberPriceService,
  ],
})
export class InventoryModule {}
