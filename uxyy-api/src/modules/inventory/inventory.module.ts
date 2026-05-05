import { Module } from '@nestjs/common';
import { ProductsController } from './controllers/products.controller';
import { SuppliersController } from './controllers/suppliers.controller';
import { SalesOrdersController } from './controllers/sales-orders.controller';
import { PurchaseOrdersController } from './controllers/purchase-orders.controller';
import { InventoryController } from './controllers/inventory.controller';
import { StocktakingController } from './controllers/stocktaking.controller';
import { ProductsService } from './services/products.service';
import { SuppliersService } from './services/suppliers.service';
import { SalesOrdersService } from './services/sales-orders.service';
import { PurchaseOrdersService } from './services/purchase-orders.service';
import { InventoryService } from './services/inventory.service';
import { StocktakingService } from './services/stocktaking.service';

@Module({
  controllers: [
    ProductsController,
    SuppliersController,
    SalesOrdersController,
    PurchaseOrdersController,
    InventoryController,
    StocktakingController,
  ],
  providers: [
    ProductsService,
    SuppliersService,
    SalesOrdersService,
    PurchaseOrdersService,
    InventoryService,
    StocktakingService,
  ],
})
export class InventoryModule {}
