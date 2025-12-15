import { Axios } from "axios";


export const reqTLE = async (satelliteName: string) => {
  const axios = new Axios();
  const response = await axios.get(`https://celestrak.org/NORAD/elements/gp.php?GROUP=${satelliteName}&FORMAT=tle`);
  console.log(response.data)
  return response.data;
}
