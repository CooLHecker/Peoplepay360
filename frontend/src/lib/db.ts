import Dexie, { type Table } from "dexie";

export interface SyncQueueItem {
  operationId: string;
  entity: string;
  action: "create" | "update" | "delete";
  payload: unknown;
  createdAt: string;
  status: "PENDING" | "SYNCING" | "SYNCED" | "FAILED";
}

export class PeoplePayDB extends Dexie {
  employees!: Table<any, string>;
  contracts!: Table<any, string>;
  attendance!: Table<any, string>;
  timeOff!: Table<any, string>;
  salaryStructures!: Table<any, string>;
  salaryRules!: Table<any, string>;
  payruns!: Table<any, string>;
  payslips!: Table<any, string>;
  syncQueue!: Table<SyncQueueItem, string>;

  constructor() {
    super("peoplepay-offline");
    this.version(1).stores({
      employees: "id",
      contracts: "id, employeeId",
      attendance: "id, employeeId, date",
      timeOff: "id, employeeId, status",
      salaryStructures: "id",
      salaryRules: "id, salaryStructureId",
      payruns: "id, period",
      payslips: "id, employeeId, payrunId",
      syncQueue: "operationId, status"
    });
  }
}

export const db = new PeoplePayDB();
