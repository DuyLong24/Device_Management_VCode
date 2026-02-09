import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayInit,
    ConnectedSocket,
    MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
    cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:5173',
        credentials: true,
    },
    namespace: '/notifications',
})

export class NotificationGateway implements OnGatewayInit {
    @WebSocketServer() server: Server;
    private logger: Logger = new Logger('NotificationGateway');

    afterInit(server: Server) {
        this.logger.log('Notification Gateway Initialized');
    }

    @SubscribeMessage('joinRoom')
    handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() userId: string) {
        if (userId) {
            client.join(userId);
            return { event: 'joinedRoom', data: userId };
        } else {
            this.logger.warn(`Client ${client.id} sent joinRoom with empty userId`);
        }
    }

    @SubscribeMessage('leaveRoom')
    handleLeaveRoom(@ConnectedSocket() client: Socket, @MessageBody() userId: string) {
        if (userId) {
            client.leave(userId);
        }
    }

    sendToUser(userId: string, payload: any) {
        this.server.to(userId).emit('new_notification', payload);
    }
}
