export type Position = {
  longitude: number,
  latitude: number,
}

export type Cell = {
  ground_position: Position,
  radius: number,
  supported_constellations: number[],
}

export type Constellation = {
  n_planes: number,
  n_sats_per_plane: number,
  inclination: number,
  altitude: number,
}

export type GroundCellMapping = {
  ground_cell_id: number,
  ran_cell_list: number[],
}

export type RanNode = {
  addr: string,
  label: string,
  mapping_list: GroundCellMapping[]
}

export type GroundCell = {
  default_ephemeris: string,
  ground_cell_id: number,
}

export type MCType = {
    log_options: string,
    log_filename: string,
    com_addr: string,
    cells_list: Cell[],

    constellation_list: (Constellation | GroundCell[])[]
    
    /* eNB connection */
    ran_node_list: RanNode[],

    /* Used for ground track display */
    n_steps: number,
    step_ms: number,
    /* Parameter for pass computation */
    min_elevation: number,
    pass_overlap: number,
    /* Uncomment to have the pass updates on the console */
    //dump_ran_status: true,
}