export interface BranchLineIntegrationDto { id?:string; displayName?:string; loginChannelId?:string; liffId?:string; isActive?:boolean; updatedAt?:string }
export interface BranchDto { id:string; name:string; code:string; claimCode?:string; address?:string|null; phone?:string|null; claimUrl?:string|null; residentClaimUrl?:string|null; lineIntegration?:BranchLineIntegrationDto|null }
export interface RoleDto { id:string; name:string; description?:string|null; isSystem?:boolean; permissions:{permission:{key:string}}[]; _count?:{users:number} }
export interface PermissionGroupDto { module:string; actions:{key:string;action:string;description:string|null}[] }
export interface UserDto { id:string;email:string;displayName:string;status:string;allBranches:boolean;role:{id:string;name:string};branches:{branch:{id:string;name:string}}[] }
export interface ApiRoom { id:string;number:string;floor:string|null;status:"VACANT"|"OCCUPIED"|"RESERVED"|"MAINTENANCE";roomType:{name:string;baseRent:number|string} }
export interface PropertyDto { id:string;name:string;type:string;buildings:{id:string;name:string;rooms:ApiRoom[]}[] }
export interface ResidentDto { id:string;fullName:string;phone:string|null;lineIdentity:{id:string}|null;contracts:{room:{id:string;number:string}}[] }
export interface InvoiceDto { id:string;number:string;total:number|string;status:string;dueDate:string;room:{number:string};contract:{resident:{fullName:string}};items:{type?:string;code?:string;amount:number|string}[] }
export interface PaymentDto { id:string;amount:number|string;createdAt:string;status:string;invoice:{room:{number:string};contract:{resident:{fullName:string}}};slip:{fileUrl:string}|null }
