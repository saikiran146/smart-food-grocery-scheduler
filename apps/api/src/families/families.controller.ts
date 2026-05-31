import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FamiliesService } from './families.service';
import { CreateFamilyDto } from './dto/create-family.dto';
import { UpdateFamilyDto } from './dto/update-family.dto';
import { InviteMemberDto } from './dto/invite-member.dto';

@ApiTags('families')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('families')
export class FamiliesController {
  constructor(private readonly familiesService: FamiliesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new family' })
  @ApiResponse({ status: 201, description: 'Family created successfully' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateFamilyDto,
  ) {
    return this.familiesService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "List all families the current user belongs to" })
  @ApiResponse({ status: 200, description: 'Returns list of families' })
  findAll(@CurrentUser('id') userId: string) {
    return this.familiesService.findAllForUser(userId);
  }

  @Post('join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join a family using an invite code' })
  @ApiResponse({ status: 200, description: 'Joined family successfully' })
  @ApiResponse({ status: 404, description: 'Invalid invite code' })
  @ApiResponse({ status: 409, description: 'Already a member of this family' })
  join(
    @CurrentUser('id') userId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.familiesService.join(userId, dto.inviteCode);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a family by ID with its members' })
  @ApiParam({ name: 'id', description: 'Family ID' })
  @ApiResponse({ status: 200, description: 'Returns family details with members' })
  @ApiResponse({ status: 403, description: 'Not a member of this family' })
  @ApiResponse({ status: 404, description: 'Family not found' })
  findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.familiesService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a family (owner or admin only)' })
  @ApiParam({ name: 'id', description: 'Family ID' })
  @ApiResponse({ status: 200, description: 'Family updated successfully' })
  @ApiResponse({ status: 403, description: 'Only owners or admins can update' })
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateFamilyDto,
  ) {
    return this.familiesService.update(id, userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a family (owner only)' })
  @ApiParam({ name: 'id', description: 'Family ID' })
  @ApiResponse({ status: 200, description: 'Family deleted successfully' })
  @ApiResponse({ status: 403, description: 'Only the owner can delete the family' })
  remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.familiesService.remove(id, userId);
  }

  @Post(':id/invite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerate the invite code for a family (owner or admin)' })
  @ApiParam({ name: 'id', description: 'Family ID' })
  @ApiResponse({ status: 200, description: 'New invite code returned' })
  @ApiResponse({ status: 403, description: 'Only owners or admins can regenerate the invite code' })
  regenerateInviteCode(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.familiesService.regenerateInviteCode(id, userId);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List all members of a family' })
  @ApiParam({ name: 'id', description: 'Family ID' })
  @ApiResponse({ status: 200, description: 'Returns list of family members' })
  @ApiResponse({ status: 403, description: 'Not a member of this family' })
  listMembers(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.familiesService.listMembers(id, userId);
  }

  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a member from a family' })
  @ApiParam({ name: 'id', description: 'Family ID' })
  @ApiParam({ name: 'memberId', description: 'User ID of the member to remove' })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to remove this member' })
  @ApiResponse({ status: 404, description: 'Member not found in this family' })
  removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.familiesService.removeMember(id, userId, memberId);
  }
}
