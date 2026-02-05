import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { FriendsService } from "./friends.service";
import { UserContext } from "../decorators/userContext";
import { AuthGuard } from "src/guards/authGuard";
import { AddFriendDto, UpdateFriendRelationshipDto } from "./friends.dto";

@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @UseGuards(AuthGuard)
  @Post()
  addFriend(@UserContext() userContext: { user: { id: string } }, @Body() addFriendDto: AddFriendDto) {
    return this.friendsService.addFriend(userContext.user.id, addFriendDto);
  }

  @UseGuards(AuthGuard)
  @Get()
  getFriends(@UserContext() userContext: { user: { id: string } }) {
    return this.friendsService.getFriends(userContext.user.id);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  updateFriendRelationship(
    @UserContext() userContext: { user: { id: string } },
    @Param('id') id: string,
    @Body() updateDto: UpdateFriendRelationshipDto,
  ) {
    return this.friendsService.updateFriendRelationship(
      userContext.user.id,
      id,
      updateDto.relationship,
    );
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  deleteFriend(@UserContext() userContext: { user: { id: string } }, @Param('id') id: string) {
    return this.friendsService.removeFriend(userContext.user.id, id);
  }
}