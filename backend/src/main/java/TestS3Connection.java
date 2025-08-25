import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.ListBucketsResponse;

public class TestS3Connection {
    public static void main(String[] args) {
        try {
            System.out.println("Creating S3 client...");

            S3Client s3Client = S3Client.builder()
                    .region(Region.US_EAST_1)
                    .credentialsProvider(DefaultCredentialsProvider.create())
                    .build();

            System.out.println("S3 Client created successfully!");

            // Test connection by listing buckets
            System.out.println("Attempting to list buckets...");
            ListBucketsResponse response = s3Client.listBuckets();

            System.out.println("Connection successful!");
            System.out.println("Number of buckets: " + response.buckets().size());

            // List bucket names
            if (!response.buckets().isEmpty()) {
                System.out.println("Buckets:");
                response.buckets().forEach(bucket ->
                        System.out.println("  - " + bucket.name())
                );
            } else {
                System.out.println("No buckets found (this is normal if you haven't created any)");
            }

            s3Client.close();

        } catch (Exception e) {
            System.out.println("Error occurred:");
            System.out.println("Error message: " + e.getMessage());
            System.out.println("Error type: " + e.getClass().getSimpleName());
            e.printStackTrace();
        }
    }
}