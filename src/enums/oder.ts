
export enum ORDER_STATUS {
  PENDING    = "pending",      
  PAID       = "paid",        
  PROCESSING = "processing", 
  SHIPPED    = "shipped",    
  DELIVERED  = "delivered",  
  CANCELLED  = "cancelled",   
  REFUNDED   = "refunded",    
}

export enum PAYMENT_STATUS {
  UNPAID    = "unpaid",
  PAID      = "paid",
  FAILED    = "failed",
  REFUNDED  = "refunded",
}

export enum PAYMENT_METHOD {
  STRIPE  = "stripe",
  COD     = "cod",           
}
