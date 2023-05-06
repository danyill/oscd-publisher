import { Insert, Remove, Update } from '@openscd/open-scd-core';
declare type ReportControlAttributes = {
    name?: string | null;
    desc?: string | null;
    buffered?: string | null;
    rptID?: string | null;
    indexed?: string | null;
    bufTime?: string | null;
    intPd?: string | null;
};
declare type TrgOpsAttributes = {
    dchg?: string | null;
    qchg?: string | null;
    dupd?: string | null;
    period?: string | null;
    gi?: string | null;
};
declare type OptFieldsAttributes = {
    seqNum?: string | null;
    timeStamp?: string | null;
    reasonCode?: string | null;
    dataRef?: string | null;
    entryID?: string | null;
    configRef?: string | null;
    bufOvfl?: string | null;
};
/** @returns action array to update all `OptFields` attributes */
export declare function updateOptFields(optFields: Element, attributes: OptFieldsAttributes): Update;
/** @returns action array to update all `TrgOps` attributes */
export declare function updateTrgOps(trgOps: Element, attributes: TrgOpsAttributes): Update;
/** @returns action array to update all `ReportControl` attributes */
export declare function updateReportControl(reportControl: Element, attributes: ReportControlAttributes): Update[];
/** @returns action to update max clients in ReportControl element */
export declare function updateMaxClients(reportControl: Element, max: string | null): Remove | Update | Insert | null;
export {};
