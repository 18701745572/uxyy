import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { PurchaseOrderItemService } from './purchase-order-item.service';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, PurchaseOrderItemService],
  exports: [InventoryService, PurchaseOrderItemService],
})
export class InventoryModule {}
