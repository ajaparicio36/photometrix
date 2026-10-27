import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { categories } from './measurement';
import type { Category } from './measurement';
const trimmed = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
const identifier = /^[A-Za-z0-9_-]{1,128}$/;
export class LoginDto {
  @Transform(trimmed) @IsEmail() @MaxLength(254) email!: string;
  @IsString() @Length(1, 256) password!: string;
}
export class NameDto {
  @Transform(trimmed) @IsString() @Length(1, 100) name!: string;
}
export class RoomDto extends NameDto {
  @IsIn(categories) category!: Category;
}
export class EditRoomDto {
  @IsOptional() @Transform(trimmed) @IsString() @Length(1, 100) name?: string;
  @IsOptional() @IsIn(categories) category?: Category;
}
export class SessionDto {
  @Matches(identifier) roomId!: string;
  @Matches(identifier) moduleId!: string;
  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(1000)
  placementNotes?: string | null;
}
export class PageDto {
  @IsOptional() @IsString() @Length(1, 2048) cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}
export class ResourceQueryDto extends PageDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  includeArchived?: boolean;
}
export class SessionQueryDto extends PageDto {
  @IsOptional() @Matches(identifier) roomId?: string;
  @IsOptional() @Matches(identifier) moduleId?: string;
  @IsOptional() @IsIn(['active', 'completed']) status?: 'active' | 'completed';
}
export class SampleQueryDto extends PageDto {
  @IsOptional() @IsIn(['complete', 'incomplete']) quality?:
    'complete' | 'incomplete';
}
export class EmptyDto {}
export class UploadDto {
  @Matches(identifier) deviceId!: string;
  @Matches(identifier) sessionId!: string;
  @Matches(identifier) sampleId!: string;
  @IsInt() @Min(0) @Max(4294967295) uptimeMs!: number;
  @IsISO8601({ strict: true })
  @Matches(/T.*Z$/)
  @MaxLength(40)
  sampledAt!: string;
  @ValidateIf((_object: unknown, value: unknown) => value !== null)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  @Max(65535)
  sensor1Lux!: number | null;
  @ValidateIf((_object: unknown, value: unknown) => value !== null)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  @Max(65535)
  sensor2Lux!: number | null;
  @ValidateIf((_object: unknown, value: unknown) => value !== null)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  @Max(65535)
  sensor3Lux!: number | null;
}
