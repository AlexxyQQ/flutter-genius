// class CustomerEntity {
//   final int? id;
//   final String? name;
//   final String? slug;
//   final String? accountType;
//   final String? image;
//   final String? type;
//   final String? description;
//   final String? orderNumber;
//   final int? editable;
//   final int? parentId;
//   final ParentDetail? parentDetail;
//   final String? code;
//   final String? nextCode;
//   final String? panNumber;
//   final CustomerDetail? customerDetail;
//   final OpeningBalance? openingBalance;
//   final String? createdAt;
//   final String? updatedAt;
//   final String? createdBy;
//   final String? updatedBy;
//   final dynamic status;
//   final int? totalRemainingInvoiceAmount;
//   final int? totalAmount;

//   CustomerEntity({
//     this.id,
//     this.name,
//     this.slug,
//     this.accountType,
//     this.image,
//     this.type,
//     this.description,
//     this.orderNumber,
//     this.editable,
//     this.parentId,
//     this.parentDetail,
//     this.code,
//     this.nextCode,
//     this.panNumber,
//     this.customerDetail,
//     this.openingBalance,
//     this.createdAt,
//     this.updatedAt,
//     this.createdBy,
//     this.updatedBy,
//     this.status,
//     this.totalRemainingInvoiceAmount,
//     this.totalAmount,
//   });
// }

// class CustomerDetail {
//   final int? id;
//   final String? name;
//   final String? email;
//   final String? phone;
//   final String? address;
//   final dynamic panNumber;

//   CustomerDetail({
//     this.id,
//     this.name,
//     this.email,
//     this.phone,
//     this.address,
//     this.panNumber,
//   });
// }

// class OpeningBalance {
//   final String? date;
//   final int? crAmount;
//   final int? drAmount;

//   OpeningBalance({
//     this.date,
//     this.crAmount,
//     this.drAmount,
//   });
// }

// class ParentDetail {
//   final int? id;
//   final String? type;
//   final String? name;
//   final String? slug;

//   ParentDetail({
//     this.id,
//     this.type,
//     this.name,
//     this.slug,
//   });
// }
class Parent_detail {
  final int id;
  final String type;
  final String name;
  final String slug;

  Parent_detail({
    required this.id,
    required this.type,
    required this.name,
    required this.slug,
  });
}

class Customer_detail {
  final int id;
  final String name;
  final String email;
  final String phone;
  final String address;
  final dynamic pan_number;

  Customer_detail({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    required this.address,
    required this.pan_number,
  });
}

class Opening_balance {
  final String date;
  final int cr_amount;
  final int dr_amount;

  Opening_balance({
    required this.date,
    required this.cr_amount,
    required this.dr_amount,
  });
}

class CustomerEntity {
  final int id;
  final String name;
  final String slug;
  final String account_type;
  final String image;
  final String type;
  final String description;
  final String order_number;
  final int editable;
  final int parent_id;
  final Parent_detail? parent_detail;
  final String code;
  final String next_code;
  final String pan_number;
  final Customer_detail? customer_detail;
  final Opening_balance? opening_balance;
  final String created_at;
  final String updated_at;
  final String created_by;
  final String updated_by;
  final dynamic status;
  final int total_remaining_invoice_amount;
  final int total_amount;

  CustomerEntity({
    required this.id,
    required this.name,
    required this.slug,
    required this.account_type,
    required this.image,
    required this.type,
    required this.description,
    required this.order_number,
    required this.editable,
    required this.parent_id,
    required this.parent_detail,
    required this.code,
    required this.next_code,
    required this.pan_number,
    required this.customer_detail,
    required this.opening_balance,
    required this.created_at,
    required this.updated_at,
    required this.created_by,
    required this.updated_by,
    required this.status,
    required this.total_remaining_invoice_amount,
    required this.total_amount,
  });
}
