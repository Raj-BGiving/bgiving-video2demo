"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchRecentJobs, QueryKeys } from "@/utils/queries";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Job } from "@/types/general";

const RecentPublicJobs = () => {
  const router = useRouter();
  const { data: jobs, isLoading } = useQuery({
    queryKey: [QueryKeys.GetRecentJobs],
    queryFn: fetchRecentJobs,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Recent Public Projects</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-24 bg-gray-100 rounded-t-lg" />
              <CardContent className="space-y-2">
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-4 bg-gray-100 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Recent Public Projects</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {jobs?.map((job: any) => (
          <Card
            key={job.id}
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => router.push(`/project/${job.id}`)}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg font-medium truncate">
                    Project {job.id}
                  </CardTitle>
                  <CardDescription>
                    {formatDistanceToNow(new Date(job.created_at), {
                      addSuffix: true,
                    })}
                  </CardDescription>
                </div>
                <Badge
                  variant={
                    job.status === "completed"
                      ? "default"
                      : job.status === "failed"
                      ? "destructive"
                      : "secondary"
                  }
                  className="capitalize"
                >
                  {job.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {job.status !== "completed" && job.status !== "failed" && (
                  <>
                    <div className="text-sm text-muted-foreground">
                      {job.progress.message}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${job.progress.progress}%` }}
                      />
                    </div>
                  </>
                )}
                <div className="text-sm text-muted-foreground">
                  Updated{" "}
                  {formatDistanceToNow(new Date(job.updated_at), {
                    addSuffix: true,
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RecentPublicJobs;
