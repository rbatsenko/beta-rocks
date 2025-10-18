/**
 * OpenBeta GraphQL API Types
 * Based on https://api.openbeta.io/graphql
 */

export interface AreaMetadata {
  lat: number;
  lng: number;
}

export interface AreaContent {
  description?: string;
}

export interface ClimbGrades {
  yds?: string;
  french?: string;
}

export interface Climb {
  id: string;
  name: string;
  grades: ClimbGrades;
  fa?: string;
}

export interface Area {
  uuid: string;
  area_name: string;
  metadata: AreaMetadata;
  pathTokens: string[];
  ancestors: string[];
  content?: AreaContent;
  children?: Area[];
  climbs?: Climb[];
}

export interface AreasResponse {
  areas: Area[];
}

export interface AreaResponse {
  area: Area;
}

export interface SearchAreasInput {
  area_name: {
    match: string;
  };
}

export interface AreasFilter {
  filter: SearchAreasInput;
}
