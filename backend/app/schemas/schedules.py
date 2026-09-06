from datetime import time
from zoneinfo import available_timezones

from pydantic import BaseModel, Field, field_validator, model_validator

_KNOWN_TIMEZONES = available_timezones()


class WorkingScheduleBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=500)
    is_flexible: bool = False
    hours_per_week: float = Field(gt=0, le=168)
    days_per_week: int = Field(ge=1, le=7)
    start_time: time | None = None
    end_time: time | None = None
    timezone: str = "Asia/Kolkata"
    is_active: bool = True

    @field_validator("timezone")
    @classmethod
    def _check_timezone(cls, value: str) -> str:
        if value not in _KNOWN_TIMEZONES:
            raise ValueError(f"Unknown timezone: {value}")
        return value

    @model_validator(mode="after")
    def _check_times(self) -> "WorkingScheduleBase":
        if self.is_flexible:
            if self.start_time is not None or self.end_time is not None:
                raise ValueError("A flexible schedule cannot have a fixed start_time/end_time")
        else:
            if self.start_time is None or self.end_time is None:
                raise ValueError("start_time and end_time are required unless the schedule is flexible")
            if self.end_time <= self.start_time:
                raise ValueError("end_time must be after start_time")
        return self


class WorkingScheduleCreate(WorkingScheduleBase):
    pass


class WorkingScheduleUpdate(WorkingScheduleBase):
    pass


class WorkingScheduleResponse(BaseModel):
    id: str
    name: str
    description: str | None = None
    isFlexible: bool
    hoursPerWeek: float
    daysPerWeek: int
    startTime: time | None = None
    endTime: time | None = None
    timezone: str
    isActive: bool
