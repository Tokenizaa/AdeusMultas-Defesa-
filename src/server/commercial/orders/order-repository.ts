/**
 * @file order-repository.ts
 * Order repository — persistence for commercial orders.
 */

import { CommercialRepository } from '../../db/commercial-repository';
import type { CommercialOrder } from './order-types';

export class OrderRepository {
  constructor(private repository: CommercialRepository) {}

  persistOrder(order: CommercialOrder): void {
    this.repository.persistOrder(order);
  }

  updateOrderStatus(orderId: string, status: string): void {
    this.repository.updateOrderStatus(orderId, status);
  }

  getOrderById(orderId: string): CommercialOrder | undefined {
    return this.repository.getOrderById(orderId);
  }

  getOrdersByCase(caseId: string): CommercialOrder[] {
    return this.repository.getOrdersByCase(caseId);
  }

  getOrdersByUser(userId: string): CommercialOrder[] {
    return this.repository.getOrdersByUser(userId);
  }
}
