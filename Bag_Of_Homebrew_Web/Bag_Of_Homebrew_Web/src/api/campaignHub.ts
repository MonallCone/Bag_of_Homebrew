import * as signalR from '@microsoft/signalr';
import { API_BASE } from '../config';

export function createCampaignConnection(): signalR.HubConnection {
  return new signalR.HubConnectionBuilder()
    .withUrl(`${API_BASE}/hubs/campaign`, { withCredentials: true }) // sends the auth cookie
    .withAutomaticReconnect()
    .build();
}