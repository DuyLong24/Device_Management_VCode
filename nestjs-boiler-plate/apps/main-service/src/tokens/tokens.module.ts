import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TokenController } from './controllers/token.controller';
import { TokenService } from './services/token.service';
import { TokenRepository } from './repositories/token.repository';
import { Token, TokenSchema } from './entities/token.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Token.name, schema: TokenSchema }])
  ],
  controllers: [TokenController],
  providers: [TokenService, TokenRepository],
  exports: [TokenService, TokenRepository]
})
export class TokenModule {}
